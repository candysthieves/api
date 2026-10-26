// Run against a disposable local container:
// node apps/payments/test/payment-event-migration.integration.cjs <container-name>
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const container = process.argv[2];
assert.ok(container, 'Pass the name of an isolated ClickHouse test container');
const database = `payment_event_migration_test_${process.pid}`;
const migration = readFileSync(
  join(
    __dirname,
    '../src/database/migrations/20261026000000_fix_payment_event_cleanup_schema.sql',
  ),
  'utf8',
);
const timestamps = [
  'created_at',
  'processing_started_at',
  'next_attempt_at',
  'completed_at',
];
const now = 1793016000123;
const old = now - 3600001;

function query(sql, useDatabase = true) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'clickhouse-client',
      '--multiquery',
      ...(useDatabase ? ['--database', database] : []),
    ],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  ).trim();
}

function rows(table) {
  return JSON.parse(
    query(`SELECT * FROM ${table} ORDER BY event_id FORMAT JSON`),
  ).data;
}

query(`CREATE DATABASE ${database}`, false);
try {
  for (const legacy of [true, false]) {
    for (const table of ['payment_inbox', 'payment_outbox']) {
      query(`DROP TABLE IF EXISTS ${table};
        CREATE TABLE ${table} (
          event_id UUID,
          status Enum8('UNPROCESSED'=1, 'PROCESSING'=2, 'OK'=3, 'ERROR'=4),
          data ${legacy ? 'String' : 'Nullable(String)'},
          attempts ${legacy ? 'UInt8' : 'Nullable(UInt8)'},
          created_at ${legacy ? 'DateTime64(3)' : 'Nullable(Int64)'},
          processing_started_at Nullable(${legacy ? 'DateTime64(3)' : 'Int64'}),
          next_attempt_at Nullable(${legacy ? 'DateTime64(3)' : 'Int64'}),
          completed_at Nullable(${legacy ? 'DateTime64(3)' : 'Int64'}),
          last_error Nullable(String)
        ) ENGINE=MergeTree ORDER BY event_id;`);
      const date = (ms) => (legacy ? `fromUnixTimestamp64Milli(${ms})` : ms);
      for (const [index, status, completed] of [
        [1, 'OK', old],
        [2, 'ERROR', old],
        [3, 'OK', now],
        [4, 'UNPROCESSED', null],
        [5, 'PROCESSING', null],
      ]) {
        query(`INSERT INTO ${table} VALUES (
          '00000000-0000-0000-0000-00000000000${index}', '${status}', 'payload', 2,
          ${date(old)}, ${date(old)}, ${date(now)},
          ${completed === null ? 'NULL' : date(completed)}, 'previous error')`);
      }
    }
    if (legacy) {
      assert.throws(
        () =>
          query(`ALTER TABLE payment_inbox UPDATE data=NULL, attempts=NULL,
        created_at=NULL WHERE status IN ('OK','ERROR') SETTINGS mutations_sync=1`),
        /Cannot convert NULL|CANNOT_CONVERT_TYPE/,
      );
    }
    // Simulate an interrupted migration after removing temporary defaults.
    query(
      migration.slice(
        0,
        migration.indexOf('ALTER TABLE payment_inbox\n    DROP COLUMN'),
      ),
    );
    query(migration);
    const firstPass = rows('payment_inbox');
    query(migration);
    assert.deepEqual(
      rows('payment_inbox'),
      firstPass,
      'Migration must be repeatable',
    );
    for (const table of ['payment_inbox', 'payment_outbox']) {
      const before = rows(table);
      assert.equal(before.length, 5);
      assert.equal(Number(before[0].created_at), old, 'Preserve milliseconds');
      assert.equal(Number(before[0].completed_at), old);
      assert.equal(before[3].completed_at, null, 'Preserve NULL timestamps');
      query(`ALTER TABLE ${table} UPDATE data=NULL, attempts=NULL,
        ${timestamps.map((name) => `${name}=NULL`).join(', ')}, last_error=NULL
        WHERE status IN ('OK','ERROR') AND completed_at <= ${now - 3600000}
        SETTINGS mutations_sync=1`);
      const after = rows(table);
      assert.equal(after.length, 5, 'Keep deduplication records');
      for (let i = 0; i < 2; i++) {
        assert.equal(after[i].event_id, before[i].event_id);
        assert.equal(after[i].status, before[i].status);
        for (const field of ['data', 'attempts', ...timestamps, 'last_error']) {
          assert.equal(after[i][field], null);
        }
      }
      assert.deepEqual(
        after.slice(2),
        before.slice(2),
        'Keep recent and active events',
      );
      query(migration);
      assert.deepEqual(
        rows(table),
        after,
        'Keep cleaned records on migration retry',
      );
    }
    console.log(
      `${legacy ? 'Legacy DateTime64' : 'Current Int64'} schema: migration, retry and cleanup passed`,
    );
  }
} finally {
  query(`DROP DATABASE ${database}`, false);
}
