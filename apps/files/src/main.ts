import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { ObjectResult } from './core/object-result.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  const config = app.get(FilesConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.tcpHost,
      port: config.tcpPort,
    },
  });

  //connect RabbitMQ
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [],
  //     queue: '',
  //   },
  // });

  await app.startAllMicroservices();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const error = {
          code: 'VALIDATION_ERROR' as const,
          errors: errors.map((error) => ({
            field: error.property,
            message: Object.values(error.constraints || {})[0],
          })),
        };

        return new RpcException(ObjectResult.failure(error));
      },
    }),
  );

  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
  console.log(
    `Files service started on TCP ${config.tcpHost}:${config.tcpPort}`,
  );
}
bootstrap();
