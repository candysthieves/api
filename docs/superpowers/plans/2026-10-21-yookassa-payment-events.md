# YooKassa Payment Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement payment creation, cancellation, YooKassa notification processing, ClickHouse inbox/outbox delivery through RabbitMQ, and global SSE notification in main.

**Architecture:** Main keeps public HTTP endpoints and synchronous TCP calls to payments. Payments uses `@a2seven/yoo-checkout`, stores payment state plus inbox/outbox events in ClickHouse, and publishes status events through RabbitMQ; main persists received events in its existing PostgreSQL inbox and emits SSE after processing. ClickHouse payment-state/event dual writes remain non-atomic by accepted design.

**Tech Stack:** NestJS, TypeScript, `@a2seven/yoo-checkout`, Kysely, ClickHouse, RabbitMQ through `@golevelup/nestjs-rabbitmq`, existing TCP transport, Prisma PostgreSQL inbox, existing SSE stream.

**Spec:** `docs/superpowers/specs/2026-10-21-yookassa-payment-events-design.md`

## Global Constraints

- Preserve public payment routes and synchronous TCP create response containing the YooKassa confirmation URL.
- Do not create a payment-status mirror table in main.
- Failed or canceled recurring charges get no retry and do not extend the paid subscription period; keep the due-charge scheduler for server-side recurring charges.
- Keep ClickHouse and accept the non-atomic payment status/outbox write gap.
- Use RabbitMQ through `@golevelup/nestjs-rabbitmq`; use TCP for synchronous main/payments calls.
- Payments inbox/outbox and main inbox use `UNPROCESSED`, `PROCESSING`, `OK`, `ERROR`, three attempts, a 10-second retry pause, stale processing recovery after one minute, one-second processing cadence, at most ten parallel events, and completed-event cleanup after one hour.
- SSE uses the existing shared stream with no user filtering. Keep a TODO asking the senior developer whether global broadcast is safe.
- Preserve unrelated worktree changes. Do not commit, push, deploy, or create a new table in main.

---

### Task 1: Add the YooKassa SDK and provider adapter

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `apps/payments/src/modules/payments/infrastructure/providers/yookassa/yookassa.service.ts`
- Modify: focused payments configuration/types only if required by the SDK

**Interfaces:**
- Preserve the existing service methods consumed by payment use cases: create a redirect payment, retrieve a payment by provider ID, and charge a saved payment method.
- Keep provider ID, status, paid flag, confirmation URL, saved method ID, amount, currency, and metadata mapped to existing domain contracts.

- [x] Add the `@a2seven/yoo-checkout` dependency without changing unrelated dependency versions.
- [x] Replace direct HTTP/fetch calls with the SDK client, preserving idempotence keys and existing RUB conversion behavior.
- [x] Inspect SDK request/response types and adapt the existing service interface without changing public HTTP responses.
- [x] Confirm provider configuration is read from existing config and secrets are not logged.

### Task 2: Create payment event contracts and ClickHouse event storage

**Files:**
- Create: `libs/contracts/payment-events.contract.ts`
- Modify: `libs/contracts/index.ts`
- Create: payments ClickHouse migration for inbox and outbox event tables under `apps/payments/src/database/migrations/`
- Modify: `apps/payments/src/database/types/payment-database.type.ts`
- Create: focused payments event repository and event-store service under `apps/payments/src/modules/payments/infrastructure/`

**Interfaces:**
- `PaymentStatusChangedEvent`: `{ eventId: string; paymentId: string; status: 'pending' | 'succeeded' | 'failed' | 'refunded'; occurredAt: string }`.
- Inbox accepts `{ eventId, type, payload, createdAt }` and ignores duplicate `eventId` without changing its stored event.
- Outbox accepts the same envelope shape and publishes only after its event row is eligible for processing.

- [x] Define and export the shared payment-status event contract.
- [x] Add ClickHouse inbox/outbox tables using the event lifecycle and retry fields already used by payments storage conventions.
- [x] Add repository operations for insert-once, selecting eligible events, claiming/finishing events, retry scheduling, stale processing recovery, and completed-row cleanup.
- [x] Preserve stable event IDs and make repeated inserts idempotent.
- [x] Do not introduce a transaction spanning payment state and outbox writes.

### Task 3: Persist YooKassa notifications into payments inbox

**Files:**
- Modify: `apps/main/src/modules/payments/api/payments.controller.ts`
- Modify: `apps/main/src/modules/payments/application/payments-tcp.service.ts`
- Modify: `apps/payments/src/modules/payments/` TCP controller/handler and notification use case
- Create or modify: payments inbox service/repository wiring

**Interfaces:**
- Main forwards a stable `eventId` and YooKassa notification body to payments over the existing TCP call.
- Payments persists the notification in ClickHouse inbox before returning accepted to main.
- Inbox processing retrieves the authoritative payment state through the YooKassa SDK and applies existing payment identity, amount/currency, and saved-method rules.

- [x] Keep the current HTTP webhook entry point in main and its response contract.
- [x] Assign an event ID at webhook ingress, forward the body over TCP, and persist it before acknowledging.
- [x] Move provider-state handling from immediate command execution to the payments inbox processor.
- [x] Keep provider retrieval authoritative; do not trust webhook fields as final payment state.

### Task 4: Publish payment status events and connect payments RabbitMQ

**Files:**
- Modify: `apps/payments/src/app.module.ts` and payments RabbitMQ configuration
- Create: payments RabbitMQ producer adapter and event scheduler
- Modify: payment status use cases/repositories that change persisted payment status
- Modify: `apps/payments/src/modules/payments/payments.module.ts`

**Interfaces:**
- Outbox publisher routes `PaymentStatusChangedEvent` to a named durable RabbitMQ queue consumed by main.
- Event scheduler processes inbox/outbox each second, handles no more than ten events concurrently, recovers stale `PROCESSING` rows every ten seconds, and deletes completed event payloads after one hour while preserving ID/status.

- [x] Configure RabbitMQ for payments with existing environment configuration conventions and `@golevelup/nestjs-rabbitmq`.
- [x] On each persisted payment status transition, insert an immutable outbox event with a stable event ID.
- [x] Add inbox/outbox scheduler work with the agreed lifecycle, retry behavior, and no overlapping local runs.
- [x] Ensure duplicate inbox delivery is idempotent and outbox publishing observes publisher confirms where supported by the existing RabbitMQ setup.

### Task 5: Consume payment events in main and emit SSE

**Files:**
- Modify: `apps/main/src/core/rabbitmq/rabbitmq.module.ts` and payment Rabbit handler registration
- Modify: `apps/main/src/core/events/inbox/inbox.controller.ts` or the focused payment inbox handler location
- Modify: main inbox event processing service/switch
- Modify: `apps/main/src/core/sse/sse.service.ts`

**Interfaces:**
- Rabbit consumer persists the payment event in the existing PostgreSQL inbox before ack.
- Main inbox processing emits a payment-status SSE event on the existing shared stream after handling the event.
- No new payment table or per-user SSE filtering is added.

- [x] Add the Rabbit subscription using the shared contract and persist before ack.
- [x] Add a main inbox event type/handler that emits the payment status payload after inbox processing.
- [x] Add the requested TODO beside the broadcast: ask the senior developer whether sending payment status to every connected SSE client is safe.
- [x] Keep the existing image/avatar inbox behavior unchanged.

### Task 6: Remove failed-charge retry behavior and preserve cancellation semantics

**Files:**
- Modify: `apps/payments/src/modules/payments/application/use-cases/process-due-subscriptions.usecase.ts` (confirm actual path)
- Modify: relevant subscription/payment repository methods and notification scheduler wiring
- Modify: no schema migration for legacy retry columns; keep stored fields for compatibility

**Interfaces:**
- Due-charge scheduler attempts a due recurring payment once for its idempotence key.
- Failed/canceled result marks the payment accordingly, creates the status outbox event, leaves the existing paid-through timestamp unchanged, and does not enqueue a retry notification.
- Subscription cancellation prevents future charges and retains the already-paid expiry.

- [x] Remove retry scheduling and retry notification behavior from YooKassa recurring-charge processing.
- [x] Keep due-charge scheduling for server-side recurring payments and preserve provider idempotence.
- [x] Remove obsolete retry and notification-table types and runtime assignments. Keep the historical ClickHouse migration and stored columns/table to avoid destructive schema changes.
- [x] Verify cancellation still stops future due charges without shortening the current paid period.

### Task 7: Review integration and documentation

**Files:**
- Review all files changed above
- Update: `docs/superpowers/specs/2026-10-21-yookassa-payment-events-design.md` only if implementation reveals a necessary, agreed clarification

- [x] Inspect the full diff and confirm the pre-existing `subscriptions.controller.ts` edit is preserved and unrelated.
- [x] Verify route/transport contracts, module registration, event names, schema names, Rabbit routing, and SSE payload agree across main and payments.
- [x] Build main and payments successfully; no integration against external services was run.
- [x] Report the accepted ClickHouse dual-write gap and any implementation limitation that remains.
