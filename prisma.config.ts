import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

const envFilePath = process.env.ENV_FILE_PATH?.trim();

dotenv.config({
  path:
    envFilePath ??
    `apps/main/src/env/.env.${process.env.NODE_ENV ?? 'development'}`,
});

export default defineConfig({
  schema: 'apps/main/prisma/schema.prisma',
  migrations: {
    path: 'apps/main/prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
