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

const currentDirectory = dirname(fileURLToPath(import.meta.url));

function findEnvFilePath(fileName: string): string | undefined {
  const candidates = [
    currentDirectory,
    resolve(currentDirectory, '../env'),
    resolve(currentDirectory, '../../../../env'),
    resolve(process.cwd(), 'apps/payments/src/env'),
    resolve(process.cwd(), 'dist/apps/payments/env'),
  ];

  return candidates
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

export function loadEnvironment(): void {
  const environment = process.env.NODE_ENV;

  if (!isSupportedEnvironment(environment)) {
    throw new Error(
      `Unsupported NODE_ENV "${environment ?? 'undefined'}". ` +
        `Expected one of: ${Object.keys(environmentFiles).join(', ')}`,
    );
  }

  const externalEnvironmentKeys = new Set(Object.keys(process.env));

  for (const fileName of environmentFiles[environment]) {
    const filePath = findEnvFilePath(fileName);
    if (!filePath) continue;

    const parsedEnvironment = parse(readFileSync(filePath));
    for (const [key, value] of Object.entries(parsedEnvironment)) {
      if (externalEnvironmentKeys.has(key) || value.trim() === '') continue;
      process.env[key] = value;
    }
  }
}
