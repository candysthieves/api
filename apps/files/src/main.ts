import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { FilesModule } from './files.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(FilesModule);
  const config = app.get(FilesConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.rabbitMqUrl],
      queue: config.rabbitMqMainToFilesQueue,
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
}
bootstrap();
