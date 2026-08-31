import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(FilesConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.tcpHost,
      port: config.tcpPort,
    },
  });

  await app.startAllMicroservices();

  console.log(
    `Files service started on TCP ${config.tcpHost}:${config.tcpPort}`,
  );
}
bootstrap();
