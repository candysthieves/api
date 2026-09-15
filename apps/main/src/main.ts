import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import { setupApp } from './setup/app-setup.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);

  setupApp(app);

  await app.listen(appConfig.port);
  logger.log(`Main service started on port ${appConfig.port}`);
}
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(
    'Main service failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
