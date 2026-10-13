import { ClickhouseDialect } from '@founderpath/kysely-clickhouse';
import { Kysely, sql } from 'kysely';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvironment } from '../env/load-env.js';

loadEnvironment();

const host = process.env.CLICKHOUSE_HOST ?? 'http://localhost:8123';
const username = process.env.CLICKHOUSE_USER ?? 'default';
const password = process.env.CLICKHOUSE_PASSWORD ?? '';
const database = process.env.CLICKHOUSE_DATABASE ?? 'payments';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(currentDir, 'migrations');

async function runMigrations() {
  console.log(`[Migrations] Connecting to ClickHouse at ${host}...`);
  console.log(`[Migrations] Database: "${database}"`);

  // 1. Подключаемся сразу к указанной в .env базе данных
  const db = new Kysely<any>({
    dialect: new ClickhouseDialect({
      options: {
        url: host,
        username,
        password,
        database,
      },
    }),
  });

  try {
    // 3. Таблица учета выполненных миграций в ClickHouse
    await sql
      .raw(
        `
      CREATE TABLE IF NOT EXISTS \`${database}\`.\`_migrations\`
      (
        name String,
        executed_at DateTime DEFAULT now()

      )
      ENGINE = MergeTree()
      ORDER BY (name)
    `,
      )
      .execute(db);

    // 4. Получаем список уже примененных миграций
    const executedRows = await db
      .selectFrom('_migrations')
      .select('name')
      .execute();
    const executed = new Set(
      (executedRows as Array<{ name: string }>).map((r) => r.name),
    );

    // 5. Ищем файлы миграций в папке migrations
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (executed.has(file)) {
        continue;
      }

      console.log(`[Migrations] Running: ${file}...`);
      const filePath = join(migrationsDir, file);
      const sqlContent = readFileSync(filePath, 'utf-8');

      const statements = sqlContent
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await sql.raw(statement).execute(db);
      }

      // Записываем в _migrations
      await db.insertInto('_migrations').values({ name: file }).execute();

      console.log(`[Migrations] Applied: ${file}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('[Migrations] All migrations are up to date.');
    } else {
      console.log(
        `[Migrations] Successfully applied ${appliedCount} migration(s).`,
      );
    }

    // 6. Проверяем и выводим созданные таблицы
    const tablesResult = await db.introspection.getTables();
    console.log(
      `[Migrations] Tables in "${database}":`,
      tablesResult.map((t) => t.name),
    );
  } catch (error) {
    console.error('[Migrations] Failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

void runMigrations();
