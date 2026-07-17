import { NestFactory } from '@nestjs/core';
import { FilesModule } from './files.module.js';

async function bootstrap() {
  const app = await NestFactory.create(FilesModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
