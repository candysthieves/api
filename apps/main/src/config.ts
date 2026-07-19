import { ConfigModule } from '@nestjs/config';

const envFilePath = process.env.ENV_FILE_PATH?.trim();

export const configModule = ConfigModule.forRoot({
  envFilePath: envFilePath
    ? [envFilePath]
    : [`apps/main/src/env/.env.${process.env.NODE_ENV ?? 'development'}`],
  isGlobal: true,
});
