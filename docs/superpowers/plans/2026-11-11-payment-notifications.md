# Payment notifications implementation plan

> Execute inline using the executing-plans skill. No commits or deployment without a user request.

**Goal:** Four independently scheduled payment notifications with enabledToExecute and online delivery.

**Architecture:** Existing payment outbox and notification inbox; Redis schedule and public notification history; TCP delivery to the authenticated Socket.IO gateway.

**Tech Stack:** Existing NestJS, ioredis, RabbitMQ, Socket.IO, Jest. No dependency updates.

**Spec:** ../specs/2026-11-11-payment-notifications-design.md

## Constraints

- Preserve four records even for past dates; no runtime contract validation.
- Do not test interservice transports or pure delegation.
- Preserve existing WIP; new use cases use .usecase.ts and relative imports use .js.

## Tasks

- [x] Contracts and payments: add NotificationTitle, scheduled event and cancellation event contracts; PaymentNotificationFactory returns four events using saved payment/subscription dates. PaymentStatusService saves each event sequentially. CancelSubscriptionUseCase persists cancellation in outbox after updating the subscription. Preserve failed-payment notifications. Verify date boundaries, disabled charge, stable IDs and partial outbox failure recovery.
- [x] Redis schedule: ScheduledNotificationFactory and ScheduledNotificationsRepository provide save, disableNextCharge, findDueIds, materialize, complete and fail. Atomic scripts replace old user schedules, ignore stale events, retain cancellation markers, and preserve public read state on retries. Verify against isolated Redis, including duplicate creation, stale events, cancellation before creation, replacement, past dates and retry exhaustion.
- [x] Scheduler: run each second without overlap, persist public notifications before best-effort online TCP delivery, retry failures three times at ten-second intervals. Mock the delivery boundary and test offline persistence and continuation after one item fails.
- [x] Connections and TCP: add main session Redis provider/config, cache socket IDs on connection, refresh active connections, remove disconnected IDs; notifications reads active IDs and sends to main. Gateway emits only to sockets belonging to the requested user. Extend gateway business tests with a mocked cache.
- [x] Run focused Jest suites, TypeScript checks/builds for main/payments/notifications, ESLint and Prettier for changed files; inspect diff. Document environment requirements and verification limits.

## Key formulas and checks

```ts
const day = 86_400_000;
const executeAt = [paidAt + 30_000, nextChargeDate === null ? null : nextChargeDate - day, expirationDate - day, expirationDate - 7 * day];
// Exactly four records. Disable null deadlines and deadlines earlier than paidAt.
// Completion updates executedAt, not enabledToExecute; counter and lists filter disabled schedules.
// A duplicate event must not reset executedAt or isRead.
// A cancelled subscription must keep its charge reminder disabled even if creation arrives later.
```

Verification: `pnpm exec jest --runInBand --runTestsByPath <changed business specs>`; `pnpm run build:main`, `pnpm run build:payments`, `pnpm run build:notifications`; `pnpm exec eslint <changed ts files>`.
