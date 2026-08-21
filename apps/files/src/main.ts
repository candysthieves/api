import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { FilesConfig } from './files.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/files/v1');
  await app.listen(process.env.port ?? 3000);
  const config = app.get(FilesConfig);

  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
}
bootstrap();
