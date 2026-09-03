import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SupportedEnvironment =
  'production' | 'development' | 'development.local' | 'testing';

const environmentFiles: Record<SupportedEnvironment, string[]> = {
  production: ['.env.production'],

  development: ['.env.production', '.env.development'],

  'development.local': [
    '.env.production',
    '.env.development',
    '.env.development.local',
  ],

  testing: ['.env.testing'],
};

function getCandidateDirectories(): string[] {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  return [
    currentDir,
    resolve(currentDir, '../env'),
    resolve(currentDir, '../../../../env'),

    // запуск из корня monorepo
    resolve(process.cwd(), 'apps/files/src/env'),

    // production build
    resolve(process.cwd(), 'dist/apps/files/env'),
  ];
}

function findEnvFilePath(fileName: string): string | undefined {
  return getCandidateDirectories()
    .map((directory) => resolve(directory, fileName))
    .find(existsSync);
}

function isSupportedEnvironment(
  environment: string | undefined,
): environment is SupportedEnvironment {
  return (
    environment !== undefined &&
    Object.prototype.hasOwnProperty.call(environmentFiles, environment)
  );
}

/**
 * Loads environment variables for the Files service.
 *
 * Priority:
 *
 * process.env
 *   >
 * .env.development.local
 *   >
 * .env.development
 *   >
 * .env.production
 *
 * Environment variables provided by Docker, Kubernetes,
 * CI or shell are never overwritten.
 */
export function loadEnvironment(): void {
  const environment = process.env.NODE_ENV;

  if (!isSupportedEnvironment(environment)) {
    throw new Error(
      `Unsupported NODE_ENV "${environment ?? 'undefined'}". ` +
        `Expected one of: ${Object.keys(environmentFiles).join(', ')}`,
    );
  }

  // Запоминаем переменные, которые существовали ДО загрузки файлов.
  // Они имеют самый высокий приоритет.
  const externalEnvironmentKeys = new Set(Object.keys(process.env));

  for (const fileName of environmentFiles[environment]) {
    const filePath = findEnvFilePath(fileName);

    if (!filePath) {
      continue;
    }

    const parsedEnvironment = parse(readFileSync(filePath));

    for (const [key, value] of Object.entries(parsedEnvironment)) {
      // Docker / Kubernetes / shell имеют максимальный приоритет.
      if (externalEnvironmentKeys.has(key)) {
        continue;
      }

      // Пустым значением не затираем предыдущий env-файл.
      if (value.trim() === '') {
        continue;
      }

      // Более специфичный файл перезаписывает менее специфичный.
      process.env[key] = value;
    }
  }
}
