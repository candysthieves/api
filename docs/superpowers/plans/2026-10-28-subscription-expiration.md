# Subscription expiration implementation plan

> Execute inline with the executing-plans skill; no delegation.

**Goal:** Return YooKassa users to Personal after paid access expires.
**Spec:** ../specs/2026-10-28-subscription-expiration-design.md
**Architecture:** Existing payments schedulers call main over TCP. Main confirms the idempotent update before payments records Failed.
**Tech stack:** NestJS, CQRS, Prisma, Kysely/ClickHouse, RxJS, Jest.

## Constraints

No schema changes, dependency changes, transactions, locks or new payment events. Preserve paid periods and renewal behavior. New-purchase races are explicitly accepted. Do not test service-to-service delivery. No commit, push or deployment.

## Tasks

- [x] Add shared set-user-personal contract, internal main controller/CQRS handler and idempotent repository update. Start main TCP listener and configure payments client with a 5-second timeout; success requires `{ success: true }`.
- [x] Extend findDueForYookassa to include cancelled expired Done and latest Failed records. Keep provider and latest-record filters. Add findPaidSubscription(userId, at) with expirationDate > at and findExpiredProcessing with the existing 15-minute condition.
- [x] Add SubscriptionExpirationService: preserve paid access, otherwise await main; fail(subscription) awaits that decision before subscriptions.fail(id). Use it in renewal branching, timeout scheduler and payment cancellation.
- [x] Extend renewal/payment-status tests and add expiration/timeout business tests. Prove Failed is not persisted on dependency failure and another item still proceeds. Run focused Jest suites.
- [x] Compile both apps, lint changed files, review diff. Record validation results and runtime configuration.
- [ ] Verify selection against isolated local ClickHouse: blocked because the local Docker Engine is unavailable, including outside the sandbox.

## Validation results

- Focused Jest suites: 3 passed, 38 tests passed.
- `pnpm run build:main` and `pnpm run build:payments`: passed.
- ESLint on all changed/new TypeScript files: passed.
- `git diff --check`: passed.
- Real ClickHouse queries were not executed; unit tests use repository substitutes.
- Runtime configuration: `MAIN_TCP_HOST` / `MAIN_TCP_PORT`, default `127.0.0.1:4004` in both applications. No schema migration is required.
