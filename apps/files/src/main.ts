import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { RpcException, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.HOST,
      port: Number(process.env.PORT),
    },
  });

  const config = app.get(FilesConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        return new RpcException({
          code: 'VALIDATION_ERROR',
          errors: errors.map((error) => ({
            property: error.property,
            message: Object.values(error.constraints || {})[0],
          })),
        });
      },
    }),
  );

  await app.listen();

  console.log(`Files service started on ${config.host}:${config.port}`);
}
bootstrap();
