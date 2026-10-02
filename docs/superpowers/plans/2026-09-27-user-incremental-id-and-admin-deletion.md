# User Auto-Increment ID and Admin Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change user IDs to database-generated integers and add administrator-only endpoints that remove one user or all users together with their related database rows and media.

**Architecture:** Keep user deletion in the existing user-accounts module and route requests through CQRS use cases and repositories. Use PostgreSQL cascades for relational dependants, the existing files TCP boundary for media, and HTTP Basic credentials from validated main-app configuration for administrator access.

**Tech Stack:** NestJS, CQRS, Prisma/PostgreSQL, Swagger, class-validator, Jest, TCP files-service contracts.

**Spec:** `docs/superpowers/specs/2026-09-27-user-incremental-id-and-admin-deletion-design.md`

## Global Constraints

- `User.id` is a PostgreSQL integer generated with Prisma `Int @id @default(autoincrement())`.
- All user IDs are numbers through main, JWT, HTTP, and inter-service contracts; unrelated IDs retain their existing formats.
- Add `DELETE /users` and `DELETE /users/:userId`; both require HTTP Basic authentication for an administrator.
- Deletion removes relational dependants and the user's currently stored avatar/post media through existing files-service methods.
- Preserve user and dependent rows with an explicit UUID-to-integer mapping; never cast UUID text to an integer.
- Rewrite persisted event JSON `userId` references in `InputEvent` and `OutputEvent`, preserving unrelated event fields.
- Do not edit generated Prisma Client files by hand or test simple inter-service delegation; stub the service boundary in business-logic tests.
- Do not commit, deploy, or run a migration against a production database without an explicit request.

---

## File Map

| Area | Files |
|---|---|
| Admin credentials and docs | `apps/main/src/env/environment.ts`, `apps/main/src/app.config.ts`, `apps/main/src/setup/app-setup.ts`, new `apps/main/src/modules/user-accounts/api/guards/admin.guard.ts` |
| User ID database schema | `apps/main/prisma/schema.prisma`, `apps/main/prisma/migrations/20260927120000_user_id_autoincrement/migration.sql`, regenerated `apps/main/src/generated/prisma/` |
| User ID types and contracts | `apps/main/src/core/types/jwt-payload.type.ts`, user and post controllers/view types/Swagger, affected user-accounts use cases/query handlers/repositories, `libs/contracts/avatar-image.contract.ts`, `apps/files/src/modules/files/application/avatar-image-queue.service.ts`, `apps/files/src/modules/files/application/avatar-image-processing.service.ts`, corresponding tests |
| Delete behavior | `apps/main/src/modules/user-accounts/infrastructure/repositories/user-repositories/users.repository.ts`, new user deletion use cases, existing `apps/main/src/core/events/files-tcp.client.ts` deletion methods |
| Route wiring | `apps/main/src/modules/user-accounts/api/users.controller.ts`, `apps/main/src/modules/user-accounts/user-accounts.module.ts`, new `apps/main/src/core/swagger/user-dto/delete-users.swagger.ts`, new `apps/main/test/e2e/users/users-delete.e2e-spec.ts` |

Before editing the broad type surface, use CodeGraph for `JwtAccessPayload`, `JwtRefreshPayload`, `userId`, and the affected contracts. Update only user IDs; preserve UUID validation and string types for post IDs, session IDs, event IDs, and file IDs.

## Task 1: Add administrator Basic Auth configuration and guard

**Files:**
- Modify: `apps/main/src/env/environment.ts`
- Modify: `apps/main/src/app.config.ts`
- Modify: `apps/main/src/setup/app-setup.ts`
- Create: `apps/main/src/modules/user-accounts/api/guards/admin.guard.ts`
- Modify: `apps/main/src/modules/user-accounts/user-accounts.module.ts`
- Test: new `apps/main/src/modules/user-accounts/api/guards/admin.guard.spec.ts`

**Interfaces:**
- `AppConfig` exposes required `adminUsername` and `adminPassword` values read from `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- `AdminGuard implements CanActivate` and accepts only a valid HTTP Basic `Authorization` header matching those configured values.
- Unauthorized requests use the existing `DomainExceptions.unauthorized` and `ErrorStatus` pattern.

- [ ] **Step 1: Add validated administrator environment fields**

Add `ADMIN_USERNAME` and `ADMIN_PASSWORD` to `EnvironmentVariables`, both required non-empty strings. Add matching `readonly` properties to `AppConfig` and read them with `configService.getOrThrow`. Supply test values in test setup without adding real credentials to the repository.

- [ ] **Step 2: Add the failing guard cases**

Test missing authorization, malformed Basic credentials, incorrect username, incorrect password, and valid credentials. Assert unauthorized cases use the existing domain exception and valid credentials return `true`.

- [ ] **Step 3: Implement `AdminGuard`**

Decode the Basic authorization value, compare the supplied username and password to `AppConfig`, and reject malformed input without throwing parsing errors. Never log the header or decoded credentials. Register the guard as a provider in `UserAccountsModule`.

- [ ] **Step 4: Add Swagger Basic Auth support**

In `setupApp`, add a named HTTP Basic scheme with `DocumentBuilder.addBasicAuth({}, 'adminBasic')`. The user-deletion Swagger decorators in Task 5 will reference it with `@ApiBasicAuth('adminBasic')`.

- [ ] **Step 5: Run the focused guard test**

Run: `pnpm test -- --runInBand apps/main/src/modules/user-accounts/api/guards/admin.guard.spec.ts`

Expected: all credential parsing and access cases pass; the command reports at least one executed test.

## Task 2: Change Prisma user IDs and create a data-preserving migration

**Files:**
- Modify: `apps/main/prisma/schema.prisma`
- Modify: `apps/main/prisma/migrations/20260927120000_user_id_autoincrement/migration.sql`
- Regenerate: `apps/main/src/generated/prisma/` using the repository Prisma script

**Interfaces:**
- `User.id`, `OAuthAccount.userId`, `Post.userId`, and `Session.userId` are Prisma `Int` values.
- User relations to OAuth accounts, posts, and sessions all use `onDelete: Cascade`.

- [ ] **Step 1: Update the Prisma source schema**

Set `User.id` to `Int @id @default(autoincrement())`. Change the three direct foreign-key scalar fields to `Int` and add `onDelete: Cascade` to the Post relation. Leave OAuth and Session UUID primary keys unchanged.

- [ ] **Step 2: Replace the empty-database migration with an atomic data migration**

Preserve this migration path/name because the branch's migration has not been applied as a release. In one transaction, create a temporary mapping with `row_number()` ordered by `created_at, id`, add integer replacement columns for the user ID and each FK, and populate them by joining the mapping. Rewrite matching JSONB event `userId` strings in `InputEvent` and `OutputEvent` through the same mapping. Drop only old FK constraints, indexes, PK, and UUID columns after replacement values are populated. Rename replacement columns, restore the PK/FKs and existing user ID indexes, and attach an integer sequence whose next value is greater than every assigned ID. Keep OAuthAccount/Post/Session rows and event IDs, statuses, bodies, and unrelated event data unchanged. Check for unmapped references and fail instead of silently orphaning them. Do not include a UUID-to-integer cast or a production database command.

- [ ] **Step 3: Regenerate Prisma Client**

Run: `pnpm run prisma:generate:local`

Expected: Prisma Client exposes integer user and foreign-key fields. Review generated output as generated files; make no manual edits.

- [ ] **Step 4: Validate the schema and data-preservation invariants**

Review the migration SQL to confirm the mapping is one-to-one, all dependent FK and event JSON references are updated before old IDs are dropped, no rows are deleted, the sequence advances beyond assigned IDs, and all cascading relations/indexes are restored. Keep actual production migration execution operator-owned.

## Task 3: Convert user IDs to numbers across the application and contracts

**Files:**
- Modify: `apps/main/src/core/types/jwt-payload.type.ts`
- Modify: `apps/main/src/modules/user-accounts/api/users.controller.ts` and `post.controller.ts`
- Modify: user-related DTO/view types and Swagger definitions under `apps/main/src/modules/user-accounts/api/` and `apps/main/src/core/swagger/`
- Modify: affected user-account use cases, query handlers, repositories, and auth/session services identified through CodeGraph
- Modify: `libs/contracts/avatar-image.contract.ts`
- Modify: `apps/files/src/modules/files/application/avatar-image-queue.service.ts`
- Modify: `apps/files/src/modules/files/application/avatar-image-processing.service.ts`
- Test: affected existing unit tests and contract tests

**Interfaces:**
- `JwtAccessPayload.userId`, `JwtRefreshPayload.userId`, every internal user ID parameter, and every public user ID field are `number`.
- Avatar event `userId` fields accept integer IDs; `eventId`, `postId`, `sessionId`, and `fileId` remain strings/UUIDs.

- [ ] **Step 1: Update the JWT payload types and token consumers**

Change only `userId` in both JWT payload types to `number`. Update token creation, refresh/session checks, decorators, commands, and queries that pass user IDs to use numbers. Keep `sessionId` as a string.

- [ ] **Step 2: Update user ID route parsing and API types**

Replace UUID parsing only on user ID route parameters with integer parsing and positive-value validation. Update profile and post-author view types, Swagger parameter/property types, and examples to numeric user IDs. Retain `ParseUUIDPipe` on post IDs.

- [ ] **Step 3: Update the avatar event contract**

Change avatar input/output event `userId` properties to `number`. Replace the UUID check for `data.userId` with integer validation; keep the UUID check for `eventId`. Update the avatar queue consumer to validate its numeric RabbitMQ header and construct a numeric event. In the files avatar processor, keep file-storage `targetId` as a string by converting the numeric user ID at that boundary. No other current shared contract carries a user ID.

- [ ] **Step 4: Update repositories and application signatures**

Use CodeGraph callers of `UsersRepository`, `UsersQueryRepository`, `PostsQueryRepository`, `OAuthRepository`, and `SessionsRepository` to update each user ID parameter, comparison, command, and query type to `number`. Check registration/OAuth creation still omits the generated user ID rather than assigning a UUID.

- [ ] **Step 5: Update focused tests and build main/contracts**

Update existing tests with numeric user fixtures while preserving UUID fixtures for unrelated IDs. Run relevant unit/contract tests, `pnpm run build:main`, and `pnpm run build:files`; verify at least one test ran for each invoked test command.

## Task 4: Implement cascade-aware user deletion use cases

**Files:**
- Modify: `apps/main/src/modules/user-accounts/infrastructure/repositories/user-repositories/users.repository.ts`
- Create: `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/delete-user.usecase.ts`
- Create: `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/delete-all-users.usecase.ts`
- Test: `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/delete-user.usecase.spec.ts`
- Test: `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/delete-all-users.usecase.spec.ts`

**Interfaces:**
- `DeleteUserCommand(userId: number)` deletes one user or raises the established user-not-found error.
- `DeleteAllUsersCommand()` completes successfully for an empty table and deletes all users otherwise.
- Both use cases collect stored media IDs, request file deletion through existing `FilesTcpClient` methods, and then hard-delete relational user rows so FK cascades remove posts, sessions, and OAuth accounts.

- [ ] **Step 1: Add repository methods for deletion data**

Add focused repository methods to find one user's avatar/preview and posts' images/previews, and to hard-delete one or all user rows. Reuse `getFileIds` for JSON media extraction. Do not query Prisma directly from the controller.

- [ ] **Step 2: Collect and delete stored media with existing file operations**

Collect distinct file IDs from the user's avatar and preview, plus every related post's images and preview. Reuse the existing `deleteFiles` and `deletePostMedia` operations in `FilesTcpClient`; do not add TCP/RabbitMQ commands or contracts.

- [ ] **Step 3: Implement the single-user use case**

Find the user or raise `USER_NOT_FOUND`; collect its stored media IDs; delete those media through the existing files boundary; then hard-delete the user so database cascades remove posts, sessions, and OAuth accounts. Surface files-service failures with the project's service-unavailable error and leave the user row available for retry.

- [ ] **Step 4: Implement the delete-all use case**

Load each user's stored media IDs and apply the single-user deletion behavior. An empty result is a successful no-op.

- [ ] **Step 5: Test deletion invariants at the use-case boundary**

Cover missing user, empty bulk delete, media ID collection/deduplication, files-service failure, and successful relational deletion. Mock repositories and the files client; do not test TCP/RabbitMQ delivery.

## Task 5: Expose the administrator-only endpoints and Swagger documentation

**Files:**
- Modify: `apps/main/src/modules/user-accounts/api/users.controller.ts`
- Modify: `apps/main/src/modules/user-accounts/user-accounts.module.ts`
- Create: `apps/main/src/core/swagger/user-dto/delete-users.swagger.ts`
- Test: `apps/main/test/e2e/users/users-delete.e2e-spec.ts`

**Interfaces:**
- `DELETE /users/:userId`: positive numeric path ID, Basic Auth required, 204 on deletion, existing not-found response for an unknown ID.
- `DELETE /users`: Basic Auth required, 204 after all user data is removed; empty user table is a successful no-op.

- [ ] **Step 1: Add route-level Swagger contracts**

Document both delete operations, numeric `userId`, 204, 401, and the named `adminBasic` scheme using `@ApiBasicAuth('adminBasic')`. Ensure Swagger's `Authorize` dialog accepts administrator username/password and applies them to both routes.

- [ ] **Step 2: Add both controller routes**

Add the routes to `UsersController`, apply `AdminGuard`, parse the ID as a positive integer, and dispatch the corresponding CQRS command. Return no body with HTTP 204. Do not add a public registration or administrator creation endpoint.

- [ ] **Step 3: Register commands and handlers**

Register both use cases in `UserAccountsModule` providers and ensure the repository/files dependencies are available through existing module wiring.

- [ ] **Step 4: Add HTTP e2e coverage**

Verify valid Basic Auth reaches each route, missing/invalid credentials are rejected, single-user deletion rejects malformed and unknown IDs, successful deletion returns 204, and bulk deletion returns 204 for populated and empty tables. Use an isolated local PostgreSQL database to prove Post, OAuthAccount, and Session cascades; stub only the files-service boundary.

- [ ] **Step 5: Run relevant final checks**

Run focused unit/e2e tests, `pnpm run build:main`, and `pnpm run build:files`. Confirm actual executed test counts. Inspect `git diff` to ensure no unrelated changes or generated Prisma edits outside regeneration.

## Completion checklist

- `User.id` and all user foreign keys are integer auto-increment-compatible Prisma fields.
- User IDs are numeric in tokens, API documentation, API types, queries, commands, and shared event contracts.
- Unrelated UUID identifiers remain strings and retain UUID parsing/validation.
- Both delete routes require configured HTTP Basic admin credentials, and Swagger documents the same scheme.
- Database cascades remove posts, OAuth accounts, and sessions; currently stored avatar and post media are deleted before success is returned.
- Migration SQL contains no UUID-to-integer cast, preserves existing user/dependent/event rows, maps every stored user reference, and initializes the user sequence above the assigned IDs.
- Focused checks pass and report non-zero executed test counts.
