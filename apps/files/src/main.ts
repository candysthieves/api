import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/files/v1');
  const config = app.get(FilesConfig);

  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
}
bootstrap();
