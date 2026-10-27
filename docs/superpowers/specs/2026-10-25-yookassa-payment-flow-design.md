# Оплата Business через ЮKassa

## Требования и согласованные решения

Источник — приложенные пользователем текст и схема, уточнения в беседе 2026-10-25.

- HTTP main → TCP payments → ЮKassa: создать платёж, сохранить его и вернуть ссылку.
- Webhook main → PostgreSQL outbox → RabbitMQ → ClickHouse inbox payments.
- Обработчик payments находит платёж по externalPaymentId; для pending получает состояние в ЮKassa, сохраняет статус и paymentMethodId, затем сохраняет событие результата в outbox.
- RabbitMQ → PostgreSQL inbox main → User.paymentStatus = Business → SSE `{ userId, paymentStatus: 'completed' }`. Написание исправлено по уточнению пользователя.
- Один экземпляр каждого сервиса. Без транзакций, распределённых блокировок и runtime-валидации внутренних контрактов.
- Автосписания не входят в эту итерацию; сохраняется только пригодный для будущих списаний идентификатор способа оплаты.
- Pending старше 15 минут отменяется локально, без запроса в ЮKassa. После canceled уведомления не меняют платёж. Пользователь указал срок жизни платежа в ЮKassa 10 минут; это принятое условие задачи, не результат проверки настроек магазина.
- Курс задан пользователем: 1 RUB = 0.012 USD. `amount = Math.round(Number(priceInMinorUnits) / 0.012)` копеек; ЮKassa получает `(amount / 100).toFixed(2)` RUB. Пример: 100 центов → 8333 копейки.
- Не обновлять зависимости. Не делать commit, push, deploy или миграции реальных БД.

## Существующая реализация

`POST /payments`, JWT guard, DTO tariffId/provider, TCP `create-payment` и ответ `{ paymentId, paymentUrl }` уже существуют. YookassaService — заглушка. PaymentFactory ошибочно использует userExternalPaymentId сначала как userId, затем перезаписывает его ID провайдера. В ClickHouse нет payment inbox/outbox. Main уже имеет универсальные таблицы событий и scheduler, но обработчики поддерживают только изображения. User.paymentStatus уже содержит Personal/Business.

## Изменения

Сохранить HTTP/TCP интерфейс создания. После получения ссылки от провайдера вставить платёж с отдельными userId/externalPaymentId, tariffId, amount (минимальные денежные единицы), currency, provider, createdAt, pending, paymentMethodId=null. Существующий внешний ID переименовать SQL-миграцией; старым строкам новые поля дать пустые/нулевые значения без выдумывания данных. Отсутствие атомарности вызова провайдера и записи БД принимается как ограничение.

В YookassaService использовать API v3 через встроенный fetch, Basic Auth, idempotence key = внутренний paymentId, redirect confirmation, capture=true, save_payment_method=true. Return URL следует существующему пути `/payment/success?paymentId=...`. Статус и сохранённый способ оплаты получать через GET payment. paymentMethodId записывать, только когда payment_method.saved=true. Существующее создание Stripe сохраняется; новый webhook-поток относится к ЮKassa.

Добавить HTTP `POST /payments/webhooks/yookassa`. Принимать payment.succeeded/payment.canceled, сохранять object.id в outbox до HTTP 200. Остальные типы уведомлений завершать HTTP 200 без события. Проверять форму внешнего DTO; бизнес-статусу webhook не доверять, источник статуса — GET ЮKassa.

События:

```ts
type PaymentWebhookEvent = {
  eventId: string;
  consumer: 'PAYMENTS';
  type: 'payment.status.requested';
  data: { externalPaymentId: string };
};
type PaymentCompletedEvent = {
  eventId: string;
  consumer: 'MAIN';
  type: 'payment.completed';
  data: { userId: string; paymentStatus: 'completed' };
};
```

Webhook получает новый UUID в main. Успешный результат использует payment.id как стабильный eventId. Повтор сохранения события не перезаписывает существующую, включая очищенную, запись. После сбоя записи outbox повтор inbox может восстановить результат из уже succeeded платежа без повторного запроса провайдера. Canceled/failed не выдают Business. Неизвестный externalPaymentId завершает попытку ошибкой с обычным повтором inbox.

Payments получает две таблицы событий ClickHouse: payment_inbox/payment_outbox, JSON payload, статусы UNPROCESSED/PROCESSING/OK/ERROR, attempts, сроки обработки/повтора/завершения, lastError. Параметры совпадают с существующими событиями: обработка каждую секунду до 10 записей, 3 попытки, задержка 10 секунд, восстановление старше минуты каждые 10 секунд, очистка payload завершённых событий через час с сохранением ID/status. Ожидать завершения мутаций ClickHouse, чтобы следующие операции видели запись. По уточнению пользователя не использовать Map для ожидания конкурирующих сохранений одного eventId: save проверяет наличие события и вставляет отсутствующее. Обработка одного платежа сериализуется локально; разные платежи обрабатываются параллельно.

Consumer только сохраняет inbox до ack, ошибка сохранения возвращает requeue. Publisher ожидает confirm. Новые очереди задаются RABBITMQ_MAIN_TO_PAYMENTS_QUEUE и RABBITMQ_PAYMENTS_TO_MAIN_QUEUE. Main расширяет текущие inbox/outbox, не создавая второй обработчик тех же таблиц.

Scheduler отмены запускается каждые 15 минут и выбирает pending ЮKassa старше 15 минут; он не трогает свежие, успешные и отменённые платежи. Доступ к тому же платежу согласован с обработчиком inbox внутри одного процесса.

В main успешное событие обновляет пользователя через существующий слой users и затем отправляет `payment-completed` SSE. Повтор Rabbit-сообщения с тем же eventId не создаёт новую обработку. SSE сохраняет существующую модель доставки приложения без отдельного журнала/replay.

## Конфигурация и проверка

По уточнениям пользователя доступ payments к событиям разделён на `events/inbox/inbox.repository.ts` и `events/outbox/outbox.repository.ts`. Каждый репозиторий работает только со своей таблицей и своим типом события. Универсальный PaymentEventStoreService и выбор таблицы параметром удалены. Сервисы разделены как в main: InboxService принимает и обрабатывает входящие события, OutboxService сохраняет и обрабатывает исходящие; consumer использует InboxService, PaymentStatusService — OutboxService. Публикацией занимается отдельный PaymentsRabbitMqProducerService из core/rabbitmq. PaymentEventsScheduler содержит cron восстановления, очистки и отмены просроченных платежей. Прежний объединённый PaymentEventsService удалён.

По последующему уточнению пользователя Set `running` удалён. `recover` запускается каждые 10 секунд (`CronExpression.EVERY_10_SECONDS`); каждый cron использует `waitForCompletion`, дополнительной координации между разными cron нет.

В локальной проверке обнаружено, что драйвер Kysely ClickHouse 1.7.0 не дочитывает ответ UPDATE. Пользователь согласовал выполнение новых мутаций через command. `executeMutation` сохраняет SQL/параметры типизированного query builder и выбирает raw-command путь драйвера; обновление зависимости не требуется. Проверка на ClickHouse подтверждает завершение без предупреждений о непрочитанном ответе.

Новые параметры payments: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, обе очереди, RABBITMQ_URL. Для return URL используется FRONTEND_URL. Значения секретов в документацию не включаются.

Проверить бизнес-сценарии создания, конвертацию, статусы, повтор после сбоя outbox, canceled, сохранение способа оплаты, отмену по возрасту, порядок обновления Business/SSE. В unit-тестах подменять внешние зависимости; не тестировать доставку между микросервисами. В изолированном локальном ClickHouse проверить миграцию, чтение/запись, повтор события, retry/recovery/cleanup. Собрать main/payments/files, проверить форматирование и lint изменённого TypeScript. Реальные платежи не создавать.

Документация API проверена через Context7: [создание с сохранением способа оплаты](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment), [API](https://yookassa.ru/developers/api), [webhooks](https://yookassa.ru/developers/using-api/webhooks).
