import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);
  app.setGlobalPrefix('api');
  await app.listen(appConfig.port);
  console.log('Server started on port: ' + appConfig.port);
}
bootstrap();
