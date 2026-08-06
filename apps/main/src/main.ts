import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import cookieParser from 'cookie-parser';
import { DomainExceptionFilter } from './core/exceptions/domain-exception.filter.js';
import { DomainExceptions } from './core/exceptions/domain-exceptions.js';
import { DomainError } from './core/exceptions/domain-error.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);
  app.use(cookieParser());
  app.useGlobalFilters(new DomainExceptionFilter());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true,
      whitelist: true,
      exceptionFactory: (errors): never => {
        const errorsMessages: DomainError[] = errors.map((err) => ({
          field: err.property,
          message: Object.values(err.constraints || {})[0],
        }));

        return DomainExceptions.validation(errorsMessages);
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lumosapp API')
    .setDescription('Documentation for the Lumosapp API.')
    .setVersion('1.0')
    .addCookieAuth('refreshToken', { type: 'apiKey' }, 'refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(appConfig.port);
  console.log('Server started on port: ' + appConfig.port);
}
bootstrap();
