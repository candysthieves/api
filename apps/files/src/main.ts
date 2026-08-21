import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/files/v1');
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
