import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { FilesModule } from './files.module.js';

async function bootstrap() {
  const app = await NestFactory.create(FilesModule);
  const config = app.get(FilesConfig);

  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
}
bootstrap();
