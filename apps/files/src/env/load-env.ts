import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type SupportedEnvironment =
  'production' | 'development' | 'development.local' | 'testing';

const environmentDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../env',
);

// Files are ordered from the least to the most specific.
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

/**
 * Loads the files service environment into process.env.
 *
 * Variables passed by the process (Docker, Kubernetes, CI, or the shell) keep
 * priority. Empty values in env files do not override values from earlier files.
 */
export function loadEnvironment(): void {
  const environment = process.env.NODE_ENV;

  if (!isSupportedEnvironment(environment)) {
    throw new Error(
      `Unsupported NODE_ENV "${environment ?? 'undefined'}". Expected one of: ${Object.keys(environmentFiles).join(', ')}.`,
    );
  }

  const processEnvironmentKeys = new Set(Object.keys(process.env));
  const loadedEnvironment: Record<string, string> = {};

  for (const fileName of environmentFiles[environment]) {
    const filePath = resolve(environmentDirectory, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    for (const [key, value] of Object.entries(parse(readFileSync(filePath)))) {
      if (value.trim() !== '') {
        loadedEnvironment[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(loadedEnvironment)) {
    if (!processEnvironmentKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

function isSupportedEnvironment(
  environment: string | undefined,
): environment is SupportedEnvironment {
  return environment !== undefined && environment in environmentFiles;
}
