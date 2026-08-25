import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/files/v1');
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
            constraints: error.constraints,
          })),
        });
      },
    }),
  );

  await app.listen(config.port);
  console.log('Files service started on port: ' + config.port);
}
bootstrap();
