# YooKassa payment flow implementation plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task in this session. Track steps with checkboxes. No commits without an explicit user request.

**Goal:** Создать платёж ЮKassa и провести подтверждение через inbox/outbox до Business и SSE, отменять просроченные pending локально.

**Architecture:** Сохранить существующие HTTP/TCP интерфейсы. Дополнить события main, добавить ClickHouse inbox/outbox и RabbitMQ в payments. Внутренним контрактам доверять.

**Tech Stack:** NestJS/CQRS, Kysely/ClickHouse, Prisma/PostgreSQL, @golevelup/nestjs-rabbitmq, fetch, Jest; версии из текущего lockfile.

**Spec:** [Согласованный поток и ограничения](../specs/2026-10-25-yookassa-payment-flow-design.md).

## Global Constraints

- Один экземпляр каждого сервиса. Без транзакций, распределённых блокировок и runtime-валидации внутренних контрактов.
- Автосписания не входят в эту итерацию; сохраняется только пригодный для будущих списаний идентификатор способа оплаты.
- Курс 1 RUB = 0.012 USD, округление до копейки.
- Только pending запрашивает статус в ЮKassa; canceled игнорируется.
- Не обновлять зависимости. Не делать commit, push, deploy или миграции реальных БД.
- Новые use case файлы: .usecase.ts; относительные импорты: .js.
- Не писать тесты межсервисной доставки; подменять внешние границы в бизнес-тестах.

## Task 1: Создание платежа и сохранение данных

**Files:**

- Modify: `apps/payments/src/database/types/payment-database.type.ts`
- Create: `apps/payments/src/database/migrations/20261025000000_add_yookassa_payment_flow.sql`
- Modify: `apps/payments/src/modules/payments/application/factories/payment.factory.ts`
- Modify: `apps/payments/src/modules/payments/application/factories/payment-params.factory.ts`
- Modify: `apps/payments/src/modules/payments/application/use-cases/create-payment.use-case.ts`
- Modify: `apps/payments/src/modules/payments/infrastructure/repositories/payments/payments.repository.ts`
- Modify: `apps/payments/src/modules/payments/infrastructure/providers/yookassa/yookassa.service.ts`
- Modify: `apps/payments/src/payments.config.ts`
- Test: `apps/payments/src/modules/payments/application/use-cases/create-payment.usecase.spec.ts`

**Interfaces:** Existing CreatePaymentCommand and `{ paymentId, paymentUrl }`; YookassaService.getPayment(externalPaymentId) returns provider status and saved method ID.

- [x] Добавить бизнес-тест: userId остаётся ID пользователя после получения внешнего ID, amount хранит фактически запрошенную сумму, ошибка провайдера не создаёт pending-запись.

```ts
expect(saved.userId).toBe('42');
expect(saved.externalPaymentId).toBe('provider-payment');
expect(saved.amount).toBe(8333);
expect(saved.paymentMethodId).toBeNull();
```

- [x] Реализовать создание: получить тариф, выделить paymentId, вычислить параметры, вызвать provider, сохранить запись, вернуть mapper.

```ts
const USD_PER_RUB = 0.012;
const amount = Math.round(Number(tariff.priceInMinorUnits) / USD_PER_RUB);
const providerAmount = (amount / 100).toFixed(2);
```

- [x] Миграция переименовывает user_external_payment_id в external_payment_id, добавляет user_id, amount, currency, payment_method_id и enum canceled; старые миграции не редактировать.
- [x] Проверить сценарии тестом и собрать payments.

## Task 2: Репозитории событий payments

**Files:**

- Create: `libs/contracts/payment-event.contract.ts`; modify `libs/contracts/index.ts`
- Create: `apps/payments/src/events/inbox/inbox.repository.ts`
- Create: `apps/payments/src/events/outbox/outbox.repository.ts`
- Remove: `apps/payments/src/events/payment-event-store.service.ts` — по уточнению пользователя универсальный сервис заменён двумя независимыми репозиториями.
- Create: `apps/payments/src/events/payment-event.type.ts`
- Create: `apps/payments/src/database/execute-mutation.ts` — выполнение мутаций через command с полным чтением ответа; согласовано с пользователем после проверки драйвера.
- Extend migration from Task 1 with payment_inbox/payment_outbox.
- Check: оба репозитория на временной локальной ClickHouse без добавления постоянного проверочного скрипта.

**Interfaces:** InboxRepository.save(PaymentWebhookEvent) и OutboxRepository.save(PaymentCompletedEvent); каждый репозиторий предоставляет findPending(), markProcessing(eventId, attempts), markCompleted(eventId), markFailed(eventId, attempts, error), recover(), cleanup() и обращается только к своей таблице. InboxService и OutboxService отдельно обрабатывают найденные записи. Параметров таблицы, общего базового репозитория и универсального run(table, callback) нет.

- [x] Реализовать неизменяемое добавление с проверкой существующего eventId. По уточнению пользователя локальное ожидание конкурирующих сохранений удалено.
- [x] Реализовать выбор до 10 due UNPROCESSED, PROCESSING перед callback, OK после callback; при ошибке 10 секунд до повтора, после 3 попыток ERROR.

```ts
const exhausted = attempts >= 3;
const status = exhausted ? 'ERROR' : 'UNPROCESSED';
const nextAttemptAt = exhausted ? null : Date.now() + 10_000;
```

- [x] Добавить восстановление PROCESSING старше минуты и очистку завершённых записей старше часа до eventId/status; мутации ждать через mutations_sync=1.
- [x] Проверить на изолированном ClickHouse: два сохранения одного ID дают одну запись; повтор после cleanup не восстанавливает payload; 3 ошибки дают ERROR; stale PROCESSING восстанавливается.

## Task 3: Webhook, RabbitMQ и обработка платежа

**Files:**

- Create: `apps/main/src/modules/payments/api/dto/yookassa-webhook.dto.ts`
- Modify: `apps/main/src/modules/payments/api/payments.controller.ts`, `payments.module.ts`
- Create: `apps/main/src/modules/payments/application/use-cases/accept-yookassa-webhook.usecase.ts`
- Modify: `apps/main/src/core/events/outbox/outbox.service.ts`
- Modify: `apps/main/src/core/rabbitmq/main-rabbitmq-producer.service.ts`, `rabbitmq.module.ts`
- Create: `apps/payments/src/events/payment-events.module.ts`, `payment-events.scheduler.ts`, `payment-events.consumer.ts`
- Create: `apps/payments/src/events/inbox/inbox.service.ts`, `apps/payments/src/events/outbox/outbox.service.ts`
- Create: `apps/payments/src/core/rabbitmq/payments-rabbitmq-producer.service.ts`, `apps/payments/src/core/rabbitmq/rabbitmq.module.ts`
- Create: `apps/payments/src/modules/payments/application/services/payment-status.service.ts`
- Modify: `apps/payments/src/app.module.ts`; существующие exports PaymentsModule уже предоставляют repositories/providers для нового PaymentEventsModule.
- Test: `apps/payments/src/modules/payments/application/services/payment-status.service.spec.ts`

**Interfaces:** POST /payments/webhooks/yookassa → PaymentWebhookEvent; PaymentStatusService.process(externalPaymentId) → payment update + PaymentCompletedEvent.

- [x] Webhook-команда сохраняет уведомления succeeded/canceled до HTTP 200; остальные типы игнорирует. Consumer payments сохраняет inbox до ack, возвращает Nack(true) при ошибке БД.
- [x] Подключить ScheduleModule и RabbitMQ с durable очередями из config; публикации persistent, messageId=eventId и ожидание confirm.
- [x] Обработчик находит платёж, для pending получает ЮKassa status; сохраняет succeeded/canceled и saved paymentMethodId. При succeeded создаёт outbox с eventId=payment.id, в том числе на повторе после ошибки outbox.

```ts
if (payment.status === 'canceled') return;
// После обновления или при повторе succeeded:
await outbox.save({
  eventId: payment.id,
  consumer: 'MAIN',
  type: 'payment.completed',
  data: { userId: payment.userId, paymentStatus: 'completed' },
});
```

- [x] Проверить Business-событие только для succeeded, сохранение метода только при saved=true, canceled без обращения к провайдеру, повтор после сбоя outbox без повторного GET.

## Task 4: Business и SSE в main

**Files:**

- Modify: `apps/main/src/core/events/inbox/inbox.controller.ts`, `inbox.service.ts`
- Modify: `apps/main/src/modules/user-accounts/application/services/users.service.ts`
- Modify: `apps/main/src/core/sse/sse.service.ts`, `types/sse-event.type.ts`
- Modify: `apps/main/src/core/swagger/sse-dto/sse-events.swagger.ts`
- Test: `apps/main/src/core/events/inbox/inbox.service.spec.ts`

**Interfaces:** PaymentCompletedEvent; UsersService.activateBusiness(userId:number); SseService.emitPaymentProcessed(userId:string).

- [x] Принимать payment.completed в существующий inbox main без валидации внутреннего контракта.
- [x] Добавить ветку обработки с обновлением пользователя через UsersRepository и затем SSE.

```ts
await users.activateBusiness(Number(data.userId));
sse.emitPaymentProcessed(data.userId);
```

- [x] Тест: при ошибке записи пользователя SSE не отправляется; после успеха payload ровно `{ userId, paymentStatus: 'completed' }`; существующие ветки изображений сохраняются.
- [x] Дополнить Swagger названием события и payload.

## Task 5: Отмена по возрасту и итоговая проверка

**Files:**

- Extend: `apps/payments/src/modules/payments/application/services/payment-status.service.ts`
- Extend: `apps/payments/src/events/payment-events.scheduler.ts`
- Extend: payment status unit tests and isolated ClickHouse check.
- Create: `docs/payments-yookassa.md`

**Interfaces:** PaymentStatusService.cancelExpired() chooses pending YOOKASSA older than 15 minutes; shares per-payment execution with process().

- [x] Scheduler каждые 15 минут вызывает cancelExpired, не обращается к ЮKassa и не создаёт событие успешной оплаты.

```sql
SELECT id FROM payments
WHERE provider = 'YOOKASSA' AND status = 'pending'
  AND created_at <= now() - INTERVAL 15 MINUTE
```

- [x] Проверить свежий pending/старый pending/succeeded/canceled, повтор отмены; verify saved payment and event rows in isolated DB.
- [x] Документировать конфигурацию, новый endpoint, события, курс, принятое условие срока, команды миграции без запуска против реального окружения.
- [x] Запустить focused Jest (с проверкой числа тестов), сборки main/payments/files, Prettier и ESLint изменённых файлов, git diff --check и review diff.

Команды при исправном pnpm: `pnpm run test -- --runInBand`, `pnpm run build:main`, `pnpm run build:payments`, `pnpm run build:files`.
Если pnpm пытается заменить node_modules, использовать уже установленные CLI: `node node_modules/jest/bin/jest.js --runInBand <test paths>` и `node node_modules/@nestjs/cli/bin/nest.js build <app>`.

## Выполненные проверки — 2026-10-25

- Focused Jest: 4 suites, 23 tests passed.
- Изолированный ClickHouse: 10 проверок прошли; миграции, сохранность старых externalPaymentId, данные платежа, выбор просроченных платежей, дедупликация, очистка, retry/recovery, outbox, размер пачки и отсутствие перекрытия запусков.
- После исправления executeMutation проверка ClickHouse завершилась с exit code 0 без предупреждений о непрочитанных HTTP-ответах.
- Nest CLI: main, payments, files успешно собраны.
- ESLint изменённых TypeScript-файлов и git diff --check прошли. Изменённые файлы отформатированы Prettier.
- package.json и pnpm-lock.yaml не изменены. `pnpm run build:payments` в этом окружении пытался переустановить node_modules и завершился ошибкой no TTY; проверки выполнены уже установленными CLI без переустановки.
- Реальные платежи, миграции БД приложения, commit/push/deploy не выполнялись.

### Проверка разделения на два репозитория

- PaymentEventStoreService удалён; InboxRepository и OutboxRepository зарегистрированы в PaymentEventsModule. Consumer использует inbox, PaymentStatusService — outbox, scheduler явно обрабатывает оба направления.
- Сборка payments и ESLint изменённого кода прошли; 14 бизнес-тестов PaymentStatusService прошли.
- 10 проверок двух репозиториев на изолированной ClickHouse прошли: собственная таблица, неизменяемый повтор, статусы/повторы, восстановление, очистка, ограничение выборки. Постоянный проверочный скрипт не создавался.

### Уточнение: структура сервисов как в main

- Создать `events/inbox/inbox.service.ts` с accept/processPending и `events/outbox/outbox.service.ts` с save/processPending. Consumer вызывает InboxService, PaymentStatusService сохраняет результат через OutboxService.
- Вынести публикацию в `core/rabbitmq/payments-rabbitmq-producer.service.ts`, конфигурацию RabbitMQ — в `core/rabbitmq/rabbitmq.module.ts`, как в main.
- Удалить `events/payment-events.service.ts`. Его recover/cleanup/cancelExpired перенести без изменения расписаний в `events/payment-events.scheduler.ts`.
- Сохранить два самостоятельных репозитория согласно предыдущему уточнению пользователя. Универсальный EventStoreService не возвращать.
- Проверить сборку payments, существующие бизнес-тесты PaymentStatusService и ESLint/Prettier изменённых файлов; запросы к БД и их уже проверенное поведение не менять.

Выполнено: сервисы и RabbitMQ разделены, старый PaymentEventsService удалён, зависимости consumer и PaymentStatusService обновлены. Сборка payments, 14 бизнес-тестов и ESLint изменённых файлов прошли; форматирование проверено Prettier.
