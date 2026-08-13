import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { DomainExceptionFilter } from '../core/exceptions/domain-exception.filter.js';
import { DomainError } from '../core/exceptions/domain-error.js';
import { DomainExceptions } from '../core/exceptions/domain-exceptions.js';

export function setupApp(app: INestApplication): void {
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
    .addCookieAuth(
      'refreshToken',
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'JWT refreshToken inside cookie. Must be correct and not expired.',
      },
      'refreshToken',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);
}
