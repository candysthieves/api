import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
import { loadEnvironment } from './src/env/load-env.js';

const mainDirectory = dirname(fileURLToPath(import.meta.url));

loadEnvironment();

export default defineConfig({
  schema: resolve(mainDirectory, 'prisma/schema.prisma'),
  migrations: {
    path: resolve(mainDirectory, 'prisma/migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
