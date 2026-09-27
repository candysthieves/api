# User auto-increment ID and admin deletion design

## Goal

Change user IDs from UUID strings to database-generated integer IDs, and provide administrator-only operations to delete one user or all users together with their associated data.

## Agreed scope

- `User.id` becomes a PostgreSQL integer primary key generated with auto-increment.
- Every relation that stores a user ID uses the same integer type. The current direct relations are `OAuthAccount.userId`, `Post.userId`, and `Session.userId`.
- User IDs are numeric throughout the main application, JWT claims, HTTP DTOs and responses, and inter-service contracts. Independent UUIDs such as post IDs, file IDs, session IDs, and event IDs remain unchanged.
- Add `DELETE /users` to delete all users and `DELETE /users/:userId` to delete one user.
- Both routes require HTTP Basic authentication for an administrator. Swagger exposes a Basic Auth `Authorize` scheme so an operator can enter the configured admin username and password.
- Deleting users removes relational dependants through database cascade and removes the users' currently stored avatar and post media through the existing files service.
- The schema migration is applied after the existing data has been cleared. It does not preserve or translate UUID user IDs.

## Current project context

The Prisma `User.id` field is currently `String @id @default(uuid())`. `OAuthAccount.userId` and `Session.userId` already declare `onDelete: Cascade`; `Post.userId` currently has no cascade. Main-layer JWT payloads and several API/query/repository signatures use `string` for `userId`. The posts controller currently validates user IDs with `ParseUUIDPipe`. Avatar-image events validate `userId` as UUID in `libs/contracts`.

The main app already validates environment variables in `apps/main/src/env/environment.ts`, exposes configuration through `AppConfig`, and configures Swagger in `apps/main/src/setup/app-setup.ts`. No administrator role or guard exists today. Main already has a TCP client for cancelling post-image work and deleting file IDs through the files service.

## Design

### ID and migration

Use Prisma `Int @id @default(autoincrement())` for `User.id`, and change all relational `userId` fields and their TypeScript consumers to `number`. Keep unrelated entity IDs in their current formats. Add `onDelete: Cascade` to the Post-to-User relation and retain cascade behavior for OAuth accounts and sessions.

Create a forward-only migration that updates the user primary key and dependent FK columns after the operator has cleared the existing data. The migration must not rely on casting UUID values to integers. Update generated Prisma Client from the schema; never edit generated files directly.

Update user ID parsing, JWT payload types, API view types and Swagger schemas/examples, and the avatar event contract/validator to accept integer user IDs. Keep post, session, event, and file identifiers in their existing UUID/string formats.

### Administrator authentication

Add `ADMIN_USERNAME` and `ADMIN_PASSWORD` to main environment validation and expose them through `AppConfig`. Add an `AdminGuard` that accepts HTTP Basic credentials, validates them against configuration, and returns the existing unauthorized error format on missing or invalid credentials. Register the guard in `UserAccountsModule` and apply it to both deletion routes. Configure a named HTTP Basic Auth scheme in Swagger and document the scheme on the endpoints. Do not log credentials.

### Deletion operations

Implement the two operations through the existing controller-to-CQRS-to-use-case pattern. `DELETE /users/:userId` accepts a positive integer user ID, returns 204 on success, and returns the existing user-not-found error when the ID does not exist. `DELETE /users` returns 204 when all users and their dependants have been removed; it is safe to call when the user table is empty.

Before removing relational rows, collect file IDs referenced by the target user's avatar and posts and ask the existing files service to delete those files. Do not report successful deletion if required external file cleanup failed. Then delete user rows in PostgreSQL and let FK cascades remove posts, sessions, and OAuth accounts. For the bulk operation, apply the same behavior to every user.

The use cases must account for partial failure across PostgreSQL and the files service: there is no distributed transaction. A retry must be safe, and an external cleanup failure must surface as the project's service-unavailable error rather than silently leaving linked media behind.

### Verification

- Verify the generated Prisma schema/client uses integer user IDs and the migration has the expected foreign-key types and cascade constraints.
- Cover the admin guard's missing, invalid, and valid Basic credentials.
- Cover each endpoint's authorization and success behavior, missing user behavior for the single-user route, and cascade deletion of posts, sessions, and OAuth accounts.
- Cover file-ID collection, files-service errors, and safe retries at the use-case boundary by stubbing the service boundary.
- Update Swagger and contract validation examples for numeric user IDs.
- Run only checks relevant to the changed code and report the number of tests executed.

## Out of scope

- Production database cleanup, migration execution, deployment sequencing, and rollout are operator-owned.
- Cancelling or redesigning in-flight image processing and outbox events is outside this task.
- Preserving existing user accounts or mapping old UUIDs to new integers.
- Changing IDs for posts, sessions, files, events, or other non-user entities.
- Creating an administrator database table, role system, or separate admin login endpoint.
