# YooKassa Payment Events Design

## Goal

Keep payment creation synchronous so the caller receives the YooKassa payment URL, simplify YooKassa recurring charges to one attempt per billing date, and deliver payment status changes to the main service through RabbitMQ inbox/outbox processing before emitting SSE.

## Decisions

- Use the community Node.js package `@a2seven/yoo-checkout` behind the existing payment-provider boundary. YooKassa lists this package as a community SDK; it is not an official YooKassa library.
- Keep payment and subscription records in the payments service's existing ClickHouse database.
- Accept the non-atomic gap between a ClickHouse payment update and its outbox event insert. Do not add a second database or a reconciliation mechanism for this gap.
- Keep the public HTTP API in main. Keep synchronous main-to-payments commands over the existing TCP transport. Payment creation waits for payments to return the payment URL.
- Persist YooKassa webhook notifications to the payments inbox through the existing main-to-payments TCP boundary before main acknowledges the webhook.
- Publish payment status changes from payments through its outbox and RabbitMQ. Main persists received events in its inbox, processes them, then emits SSE. Do not add a separate payment-status table in main.
- Broadcast payment SSE through the existing shared SSE stream. Add a code TODO at the emission point: ask a senior developer whether broadcasting payment events to all connected clients is safe.
- Keep one server-side scheduler for due YooKassa charges: YooKassa stores the saved payment method, but the merchant controls charge timing. Submit one charge per due date. A confirmed failed/canceled charge does not get retried and does not extend the subscription. The already-paid period remains in effect until its current expiration date.
- A user cancellation disables future charges and does not revoke the already-paid period.

## Flows

### Create payment

1. Main handles the existing authenticated HTTP request.
2. Main sends a synchronous TCP request to payments and waits for the result.
3. Payments creates the pending ClickHouse payment, creates the YooKassa payment through the SDK, stores the provider payment ID, and returns the payment URL.
4. Main returns the payment ID and URL to the caller.

### Confirm initial payment

1. YooKassa calls the existing public webhook endpoint in main.
2. Main forwards the notification to payments over TCP.
3. Payments stores the provider payment ID as an inbox event before acknowledging the TCP call.
4. The payments inbox scheduler processes the event, reads the authoritative payment state from YooKassa through the SDK, and updates ClickHouse.
5. Payments records a payment-status event in its outbox. The payments outbox scheduler publishes it to RabbitMQ.
6. Main's RabbitMQ consumer stores the event in its inbox before acknowledging the message.
7. The main inbox scheduler processes the event and emits the payment SSE event through the shared SSE stream.

The main inbox event is the durable received event; main does not maintain a second payment-status table.

### Recurring charge

The payments scheduler finds subscriptions due for charge and submits one YooKassa payment using the saved `payment_method_id`. On success, payments records the successful payment and extends the subscription, then emits the status event through its outbox. On confirmed failure/cancellation, it records the failed payment, emits the status event, leaves the expiration date unchanged, and schedules no retry.

### Cancel subscription

Main keeps the existing subscription-cancellation HTTP endpoint and sends its command to payments over TCP. Payments marks future charging as canceled. The current paid expiration date is retained.

## Event processing

- Add scheduler processing for each payment inbox/outbox store introduced by this design.
- Follow the repository's existing event-store lifecycle and scheduler conventions for pending event selection and completion.
- Use stable event IDs and idempotent handlers so duplicate RabbitMQ delivery does not emit multiple logical payment changes.
- Preserve provider idempotency keys for each payment creation/charge.

## Known limitation

ClickHouse does not provide the same default multi-operation transaction boundary as PostgreSQL. If the payment status update succeeds but the outbox insert does not, or vice versa, the database and published event can diverge. This gap is explicitly accepted for this work; RabbitMQ does not close it.

## Scope exclusions

- No main-side payment-status mirror table.
- No payment retry after a confirmed failed/canceled recurring charge.
- No automatic consistency repair for the ClickHouse status/outbox dual-write gap.
- No per-user SSE routing in this change; the shared broadcast has a code TODO for senior review.
- No live YooKassa or production deployment actions.

## Verification

- Verify the payments application build and relevant payment/inbox/outbox behavior.
- Verify payment event publication, main inbox processing, and SSE emission after inbox processing.
- Inspect ClickHouse event table operations and scheduler wiring; do not claim a successful runtime integration test without running it.
