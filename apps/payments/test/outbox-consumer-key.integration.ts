// Uses only a disposable local ClickHouse on port 18124, never application env.
// pnpm exec tsx apps/payments/test/outbox-consumer-key.integration.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ClickhouseDialect } from '@founderpath/kysely-clickhouse';
import { CamelCasePlugin, Kysely, sql } from 'kysely';
import { OutboxRepository } from '../src/events/outbox/outbox.repository.js';
import type { PaymentDatabase } from '../src/database/types/payment-database.type.js';
import type {
  PaymentResultEvent,
  PaymentNotificationEvent,
} from '@libs/contracts';

const options = {
  url: 'http://127.0.0.1:18124',
  username: 'outbox_test',
  password: 'outbox_test',
};
const database = `outbox_pair_test_${process.pid}`;
const admin = new Kysely<PaymentDatabase>({
  dialect: new ClickhouseDialect({ options }),
});
const db = new Kysely<PaymentDatabase>({
  dialect: new ClickhouseDialect({ options: { ...options, database } }),
  plugins: [new CamelCasePlugin()],
});
const migration = readFileSync(
  new URL(
    '../src/database/migrations/20261118000000_payment_outbox_consumer_key.sql',
    import.meta.url,
  ),
  'utf8',
);
const statements = migration
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);
const run = async (text: string) => {
  await sql.raw(text).execute(db);
};
const snapshot = () =>
  db
    .selectFrom('paymentOutbox')
    .selectAll()
    .orderBy('eventId')
    .orderBy('consumer')
    .execute();

// Reproduce historical IDs only in migration fixtures, independently of SQL.
function legacyId(id: string): string {
  const bytes = createHash('sha1')
    .update(Buffer.from('9e7e582d7e314c4eae0fc951230c7d41', 'hex'))
    .update(`${id}:notification`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

await sql.raw(`CREATE DATABASE ${database}`).execute(admin);
try {
  await run('CREATE TABLE payments (id UUID) ENGINE=MergeTree ORDER BY id');
  const definition = migration
    .slice(migration.indexOf('CREATE TABLE'), migration.indexOf(';'))
    .replace('payment_outbox_pair_20261118', 'payment_outbox')
    .replace("    consumer Enum8('MAIN' = 1, 'NOTIFICATIONS' = 2),\n", '')
    .replace('ORDER BY (event_id, consumer)', 'ORDER BY event_id');
  await run(definition);
  const ids = [
    '1bc6db29-946c-45a0-a5d8-c550fcc364f3',
    '550e8400-e29b-41d4-a716-446655440000',
  ];
  assert.equal(legacyId(ids[0]), 'c87ff85b-3871-5066-8669-9588a3224461');
  for (const [index, id] of ids.entries()) {
    await sql`INSERT INTO payments (id) VALUES (${id})`.execute(db);
    for (const consumer of ['MAIN', 'NOTIFICATIONS'] as const) {
      const eventId = consumer === 'MAIN' ? id : legacyId(id);
      const data =
        index === 0
          ? null
          : JSON.stringify({
              eventId,
              consumer,
              type: 'payment.canceled',
              data: { paymentId: id, userId: '42' },
            });
      await sql`INSERT INTO payment_outbox (event_id, status, data, attempts, created_at)
        VALUES (${eventId}, ${index === 0 ? 'OK' : 'UNPROCESSED'}, ${data ?? sql`NULL`}, ${index === 0 ? sql`NULL` : 0}, ${index === 0 ? sql`NULL` : Date.now()})`.execute(
        db,
      );
    }
  }
  // Simulate interruption before rename: retry must not copy rows twice.
  for (const statement of statements.slice(0, -1)) await run(statement);
  for (const statement of statements) await run(statement);
  const migrated = await snapshot();
  assert.equal(migrated.length, 4);
  for (const id of ids) {
    assert.deepEqual(
      migrated
        .filter((r) => r.eventId === id)
        .map((r) => r.consumer)
        .sort(),
      ['MAIN', 'NOTIFICATIONS'],
    );
  }
  assert.equal(
    migrated.find(
      (r) => r.eventId === ids[0] && r.consumer === 'NOTIFICATIONS',
    )!.data,
    null,
  );
  assert.equal(
    (
      JSON.parse(
        migrated.find(
          (r) => r.eventId === ids[1] && r.consumer === 'NOTIFICATIONS',
        )!.data!,
      ) as PaymentNotificationEvent
    ).eventId,
    legacyId(ids[1]),
  );

  const repository = new OutboxRepository(db);
  const events = (
    id: string,
  ): [PaymentResultEvent, PaymentNotificationEvent] => [
    {
      eventId: id,
      consumer: 'MAIN',
      type: 'payment.canceled',
      data: { userId: '42', paymentStatus: 'canceled' },
    },
    {
      eventId: id,
      consumer: 'NOTIFICATIONS',
      type: 'payment.canceled',
      data: { userId: '42', paymentId: id },
    },
  ];
  // Both cleaned and pending legacy records still suppress retries.
  for (const id of ids)
    for (const event of events(id)) await repository.save(event);
  assert.deepEqual(await snapshot(), migrated);
  const id = '00000000-0000-4000-8000-000000000003';
  const [main, notification] = events(id);
  for (const event of [main, notification, main, notification])
    await repository.save(event);
  assert.equal((await snapshot()).length, 6);
  await repository.markProcessing(main, 1);
  await repository.markCompleted(main);
  await repository.markProcessing(notification, 1);
  await repository.markFailed(notification, 1, new Error('retry'));
  let records = (await snapshot()).filter((r) => r.eventId === id);
  assert.equal(records.find((r) => r.consumer === 'MAIN')!.status, 'OK');
  assert.equal(
    records.find((r) => r.consumer === 'NOTIFICATIONS')!.status,
    'UNPROCESSED',
  );
  await repository.markProcessing(notification, 2);
  await run(`ALTER TABLE payment_outbox UPDATE processing_started_at = 0
    WHERE event_id = '${id}' AND consumer = 'NOTIFICATIONS' SETTINGS mutations_sync=1`);
  await repository.recover();
  records = (await snapshot()).filter((r) => r.eventId === id);
  assert.equal(records.find((r) => r.consumer === 'MAIN')!.status, 'OK');
  assert.equal(
    records.find((r) => r.consumer === 'NOTIFICATIONS')!.lastError,
    'PROCESSING_TIMEOUT',
  );
  await repository.markFailed(notification, 3, new Error('exhausted'));
  await run(`ALTER TABLE payment_outbox UPDATE completed_at = 1
    WHERE event_id = '${id}' SETTINGS mutations_sync=1`);
  await repository.cleanup();
  const cleaned = await snapshot();
  await repository.save(main);
  await repository.save(notification);
  assert.deepEqual(await snapshot(), cleaned);
  records = cleaned.filter((r) => r.eventId === id);
  assert.ok(records.every((r) => r.data === null));
  assert.deepEqual(records.map((r) => r.status).sort(), ['ERROR', 'OK']);
  console.log(
    'PASS: legacy migration, interrupted retry, pair deduplication, independent statuses, recovery and cleanup',
  );
} finally {
  await db.destroy();
  await sql.raw(`DROP DATABASE ${database}`).execute(admin);
  await admin.destroy();
}
