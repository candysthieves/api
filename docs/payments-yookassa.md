# Оплата через ЮKassa

## Исправление старой схемы событий

Если cleanup падает с `Cannot convert NULL to a non-nullable type`, примените
`20261026000000_fix_payment_event_cleanup_schema.sql` через migration runner.
Старые таблицы с `DateTime64(3)` и обязательными `data`/`attempts` не обновляются
через `CREATE TABLE IF NOT EXISTS` из исходной миграции.

Перед применением остановите payments и проверьте целевую БД в выбранном окружении.
Для `development.local`: `pnpm run payments:migrate:local`. После успешной миграции
запустите payments снова. Миграция сохраняет ID, статусы, данные и миллисекунды,
разрешает NULL для очистки и поддерживает повторный запуск. Не запускайте её
параллельно с записью событий: временные столбцы копируются перед заменой.

Проверка на отдельном локальном контейнере ClickHouse:
`node apps/payments/test/payment-event-migration.integration.cjs <container-name>`.
Тест создаёт и удаляет собственную БД и проверяет старую/текущую схемы, повтор
после прерывания и очистку завершённых событий с сохранением ID и статуса.

## Настройка

В main и payments должны совпадать `RABBITMQ_URL`, `RABBITMQ_MAIN_TO_PAYMENTS_QUEUE`, `RABBITMQ_PAYMENTS_TO_MAIN_QUEUE`. Например, имена очередей: `main-to-payments` и `payments-to-main`. Обе очереди durable; приложения объявляют их самостоятельно.

В payments дополнительно нужны `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` и существующий `FRONTEND_URL`. Секреты задаются через окружение. Новые библиотеки не нужны.

Перед запуском обновлённого payments применить ClickHouse-миграцию `20261025000000_add_yookassa_payment_flow.sql` существующим migration runner. Команда локального окружения: `pnpm run payments:migrate:local`. Она использует конфигурацию приложения: перед запуском необходимо проверить целевую БД. В рамках разработки эта команда против БД приложения не выполнялась.

Миграция сохраняет существующий внешний ID в `external_payment_id`, добавляет отдельные `user_id`, `amount`, `currency`, `payment_method_id`, статус `canceled` и таблицы `payment_inbox`/`payment_outbox`. Для старых платежей userId и сумма не восстанавливаются: прежняя схема не сохраняла этих данных отдельно. Prisma-миграция не требуется.

В кабинете ЮKassa настроить HTTP-уведомления `payment.succeeded` и `payment.canceled` на `https://<api-host>/payments/webhooks/yookassa`. [Документация уведомлений ЮKassa](https://yookassa.ru/developers/using-api/webhooks).

После миграции `20261026030000_store_payment_amount_in_usd_cents.sql` в `payments.amount` хранится цена тарифа в центах USD для всех провайдеров; колонки `currency` и `amount_minor_units` удалены. Миграция рассчитана на пустую таблицу или заранее нормализованные суммы. В запросе к ЮKassa сумма по-прежнему пересчитывается в рубли, а валюта передаётся в параметрах провайдера.

## HTTP и SSE

Создание: `POST /payments` с access token и телом:

```json
{ "tariffId": 1, "provider": "YOOKASSA" }
```

Ответ `200` сохраняет существующий формат `{ "paymentId": "...", "paymentUrl": "..." }`. UserId берётся из авторизованного пользователя. Payments получает тариф, создаёт платёж в ЮKassa и сохраняет запись до возврата ссылки.

Цена тарифа `price` хранится в центах USD. Константа `USD_PER_RUB = 0.012` задана пользователем: 1 RUB = 0.012 USD. Для ЮKassa `Math.round(price / USD_PER_RUB)` даёт копейки, например 100 центов → 8333 копейки → 83.33 RUB. В `payments.amount` сохраняется исходная цена тарифа в центах USD. Создание Stripe продолжает использовать USD.

Миграция `20261026040000_use_integer_tariff_ids.sql` назначает тарифам UInt32 ID по возрастанию `duration_days` (при равенстве — по имени и прежнему ID), переименовывает колонку цены в `price` и переносит ссылки в платежах и подписках. Выполнять при остановленном payments: переключение нескольких таблиц не атомарно. Исходные таблицы остаются с суффиксом `_backup_20261026`, таблица `tariff_id_mapping_20261026` сохраняет соответствие ID. Миграцию нельзя повторять вручную после успешного переключения; её выполнение учитывается в `_migrations`.

HTTP API тарифов возвращает числовой `id` и поле `price` вместо `priceInMinorUnits`. `POST /payments` принимает числовой `tariffId`, например `1` для Daily, `2` для Weekly, `3` для Monthly и `4` для Quarterly в текущем каталоге.

Webhook принимает стандартный объект ЮKassa с `type`, `event`, `object.id`, отвечает `200` после сохранения outbox. Статус из тела уведомления не используется для выдачи Business: payments запрашивает платёж у ЮKassa. Не относящиеся к платежу события игнорируются.

После успешной оплаты main обновляет `User.paymentStatus` на `Business` и отправляет в существующий `GET /events`:

```text
event: payment-completed
data: {"userId":"42","paymentStatus":"completed"}
```

Статус успешной оплаты в SSE — `completed`. Поле пользователя имеет значение `Business`, это отдельное поле от статуса оплаты в SSE.

## Обработка и повторы

Поток: webhook main → PostgreSQL outbox → RabbitMQ → ClickHouse inbox → GET ЮKassa → платёж + ClickHouse outbox → RabbitMQ → PostgreSQL inbox → Business/SSE.

В payments за таблицы отвечают отдельные `InboxRepository` и `OutboxRepository`. Как в main, входящие события принимает и обрабатывает `InboxService`, исходящие сохраняет и обрабатывает `OutboxService`. Consumer вызывает `InboxService.accept`, обработчик платежа — `OutboxService.save`. Публикация вынесена в `PaymentsRabbitMqProducerService`, конфигурация подключения — в отдельный RabbitMqModule. `PaymentEventsScheduler` запускает восстановление, очистку и отмену просроченных платежей.

Consumer подтверждает Rabbit-сообщение после сохранения inbox. Publisher ожидает подтверждения. Внутренние сообщения типизированы общими контрактами без повторной runtime-валидации. EventId результата равен внутреннему paymentId: повтор не создаёт второй результат. Если платежу уже записан succeeded, а outbox сохранить не удалось, повтор inbox восстанавливает outbox без нового GET.

Статусы событий: UNPROCESSED/PROCESSING/OK/ERROR. Обработка раз в секунду, до 10 параллельных событий, 3 попытки с паузой 10 секунд. Зависшее PROCESSING старше минуты восстанавливается каждые 10 секунд. Через час после завершения остаются только eventId/status. Повтор не меняет очищенную запись. Один экземпляр каждого приложения; распределённые блокировки и транзакции не используются.

`paymentMethodId` сохраняется только при `payment_method.saved=true`. Автоматических списаний новый поток не запускает. [Сохранение способа оплаты в ЮKassa](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment).

Scheduler каждые 15 минут отменяет pending ЮKassa старше 15 минут локально, без запроса провайдера. Из-за периодичности запуска отмена происходит на ближайшем проходе после достижения возраста 15 минут. После canceled webhook игнорируется. Основание — заданное пользователем условие о 10 минутах действия платежа в ЮKassa; интеграция не меняет этот срок на стороне провайдера.

Принятые ограничения: вызов провайдера и запись платежа неатомарны; SSE использует существующий поток приложения без журнала доставки; после исчерпания попыток событие остаётся ERROR. Новая логика не управляет продлением/истечением подписки.

## Проверки

Unit-тесты находятся рядом с create-payment, payment-status, YookassaService и inbox main. Они проверяют бизнес-результат с подменой внешних зависимостей, не доставку между микросервисами.

Проверки данных InboxRepository и OutboxRepository выполняются на временном локальном ClickHouse с отдельной тестовой БД, без загрузки `.env` приложения. Проверяются повторное сохранение eventId, выбор ожидающих записей, статусы обработки, retry/recovery и очистка. Ранее использовавшийся `payment-event-store.check.ts` удалён из рабочей копии; постоянный проверочный скрипт не добавляется.

Сборки: `pnpm run build:main`, `pnpm run build:payments`, `pnpm run build:files`. В окружении, где pnpm пытается переустановить node_modules, можно вызвать уже установленные CLI напрямую: `node node_modules/@nestjs/cli/bin/nest.js build payments` и `node node_modules/jest/bin/jest.js --runInBand`.
