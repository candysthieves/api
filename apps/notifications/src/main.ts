import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { NotificationsConfig } from './notifications.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(NotificationsConfig);
  await app.listen(config.port);
}
bootstrap();
