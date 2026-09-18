# Fail post image once

**Goal:** Reject failed jobs without requeueing, clean up created files, and persist FAILED in the existing outbox. Its scheduler remains responsible for delivery retries.

**Design:** User-approved in conversation. Keep inbox deduplication; do not recover or reprocess duplicate jobs. Main already deletes the post on FAILED. If writing FAILED itself fails, log it; there is no persisted event for the scheduler to deliver.

**Constraints:** No transport tests, dependency upgrades, commits, or new messaging contracts.

- [x] Simplify the queue to parse and delegate, logging exceptions and returning `Nack(false)`.
- [x] Handle worker failures by independently attempting FAILED persistence, cancellation, terminal state, and cleanup. Preserve successful image/preview behavior.
- [x] Roll back S3 objects when saving file metadata fails.
- [x] Update worker business tests for failures and deduplication; run focused tests and static checks.

Validation: 21 tests passed across worker, file cleanup, and main inbox suites; ESLint passed for all five changed TypeScript files; files TypeScript check passed (`tsc --noEmit --incremental false`). No live databases or transport tests were run.
