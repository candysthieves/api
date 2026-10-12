import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);

// Ищем имя: либо аргумент после флажка --name, либо первый позиционный аргумент
let migrationNameInput: string | undefined;
const nameFlagIndex = args.findIndex((arg) => arg === '--name' || arg === '-n');

if (nameFlagIndex !== -1 && args[nameFlagIndex + 1]) {
  migrationNameInput = args[nameFlagIndex + 1];
} else {
  migrationNameInput = args.find((arg) => !arg.startsWith('-'));
}

if (!migrationNameInput) {
  console.error('Error: Please provide a migration name.');
  console.error('Usage:');
  console.error('  pnpm run payments:migration:create --name <migration_name>');
  console.error('  pnpm run payments:migration:create <migration_name>');
  process.exit(1);
}


// Форматируем имя миграции (только маленькие буквы, цифры и подчеркивания)
const sanitizedName = migrationNameInput
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_]/g, '_')
  .replace(/_+/g, '_');

// Формируем метку времени в формате YYYYMMDDHHmmss
const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0'),
].join('');

const fileName = `${timestamp}_${sanitizedName}.sql`;
const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(currentDir, 'migrations');
const targetFile = join(migrationsDir, fileName);

const template = `-- Migration: ${sanitizedName}
-- Created at: ${now.toISOString()}

-- Write your ClickHouse SQL query here. Example:
-- CREATE TABLE IF NOT EXISTS ${sanitizedName}
-- (
--     id UUID DEFAULT generateUUIDv4(),
--     created_at DateTime DEFAULT now()
-- )
-- ENGINE = MergeTree()
-- ORDER BY (created_at, id);
`;

writeFileSync(targetFile, template, 'utf-8');

console.log(`[Migrations] Successfully created:`);
console.log(`  -> ${targetFile}`);
