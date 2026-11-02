# Integer tariff IDs implementation plan

> Execute inline using executing-plans. Do not commit or push.

**Goal:** Rename tariffs.price_in_minor_units to price and assign integer IDs ordered by duration_days, preserving payment and subscription references.

**Architecture:** Rename HTTP/TCP tariff priceInMinorUnits to price as requested; make tariff IDs numeric throughout HTTP, TCP and repositories. Store price in USD cents. Use ClickHouse replacement tables because the UUID tariff ID belongs to the sorting key. Keep old tables as backups.

**Tasks:**
- [x] Change tariffId to number in DTO, contract, commands, factories, repositories and test fixtures; replace IsUUID with IsInt/Min(1). Update Swagger ID examples.
- [x] Change tariff database property to price; return price in tariff responses. Keep provider currency conversion unchanged.
- [x] Add SQL migration: mapping from old UUID to row_number ordered by duration_days, name, id; build new tariffs/payments/subscriptions tables; copy data with mapped IDs; rename originals to backups and replacements to original names.
- [x] Test migration on an isolated local database with shuffled tariff IDs and references in both related tables. Verify prices, durations, other columns and associations survive.
- [x] Build main/payments, run affected unit tests and lint. Apply migration to local lumosapp and record it in _migrations; verify IDs and references.
