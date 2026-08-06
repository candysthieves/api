import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import cookieParser from 'cookie-parser';
import { DomainExceptionFilter } from '../src/core/exceptions/domain-exception.filter.js';
import { DomainExceptions } from '../src/core/exceptions/domain-exceptions.js';
import { DomainError } from '../src/core/exceptions/domain-error.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new DomainExceptionFilter());
    app.setGlobalPrefix('api');
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
    await app.init();
  });

  afterEach(async () => app?.close());

  it('/api (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect('Main!');
  });

  it('uses the unified format for validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/registration')
      .send({})
      .expect(400);

    expect(response.body).toEqual({
      errorsMessages: [
        expect.objectContaining({
          field: 'username',
          message: expect.any(String),
        }),
        expect.objectContaining({
          field: 'email',
          message: expect.any(String),
        }),
        expect.objectContaining({
          field: 'password',
          message: expect.any(String),
        }),
        expect.objectContaining({
          field: 'passwordConfirmation',
          message: expect.any(String),
        }),
        expect.objectContaining({
          field: 'isTermsAccepted',
          message: expect.any(String),
        }),
      ],
    });
  });

  it('uses the unified format when the refresh cookie is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh-token')
      .expect(401);

    expect(response.body).toEqual({
      errorsMessages: [{ field: '', message: 'Unauthorized' }],
    });
  });

  it('uses the standard Nest format for an unknown route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/unknown-route')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'Cannot GET /api/unknown-route',
      error: 'Not Found',
    });
  });
});
