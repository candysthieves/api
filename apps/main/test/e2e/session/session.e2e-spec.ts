import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { expect, jest } from '@jest/globals';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../../src/app.module.js';
import { setupApp } from '../../../src/setup/app-setup.js';
import { EmailAdapter } from '../../../src/core/adapters/email/email.adapter.js';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service.js';
import { RegistrationDto } from '../../../src/modules/user-accounts/api/dto/registration.dto.js';

describe('Sessions e2e tests', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    httpServer = app.getHttpServer();
    prisma = app.get<PrismaService>(PrismaService);
    jest.spyOn(EmailAdapter.prototype, 'sendEmail').mockResolvedValue();
  });

  beforeEach(async () => {
    await request(httpServer).delete('/testing/all-data').expect(204);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerAndConfirmUser(inputDto: RegistrationDto) {
    await request(httpServer)
      .post('/auth/registration')
      .send({
        username: inputDto.username,
        email: inputDto.email,
        password: inputDto.password,
        passwordConfirmation: inputDto.passwordConfirmation,
        isTermsAccepted: inputDto.isTermsAccepted,
      })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: inputDto.email },
      select: { id: true, confirmationCode: true },
    });

    await request(httpServer)
      .post('/auth/registration-confirmation')
      .send({ code: user.confirmationCode })
      .expect(204);

    return user;
  }

  async function loginUser(
    inputDto: Pick<RegistrationDto, 'email' | 'password'>,
  ) {
    return request(httpServer)
      .post('/auth/login')
      .send({
        email: inputDto.email,
        password: inputDto.password,
      })
      .expect(200);
  }

  async function createTwoSessions(inputDto: RegistrationDto) {
    const user = await registerAndConfirmUser(inputDto);
    await loginUser(inputDto);

    const firstSession = await prisma.session.findFirstOrThrow({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });

    const secondLogin = await loginUser(inputDto);

    const secondSession = await prisma.session.findFirstOrThrow({
      where: {
        userId: user.id,
        deletedAt: null,
        id: { not: firstSession.id },
      },
      select: { id: true },
    });

    return { firstSession, secondSession, secondLogin };
  }

  it('Get active sessions for the current user', async () => {
    await request(httpServer)
      .get('/security/session')
      .set('Cookie', 'refreshToken=invalid-token')
      .expect(498);

    const firstUser = await createTwoSessions({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    });
    const secondUser = await createTwoSessions({
      username: 'john_doe_2',
      email: 'john.doe_2@example.com',
      password: 'SecurePass12!',
      passwordConfirmation: 'SecurePass12!',
      isTermsAccepted: true,
    });

    const sessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(200);

    expect(sessions.body).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(sessions.body[0].deviceId).not.toBe(secondUser.firstSession.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(sessions.body[0].deviceId).not.toBe(secondUser.secondSession.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(sessions.body[1].deviceId).not.toBe(secondUser.firstSession.id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(sessions.body[1].deviceId).not.toBe(secondUser.secondSession.id);
  });

  it('Delete all active sessions except the current one', async () => {
    await request(httpServer)
      .delete('/security/session')
      .set('Cookie', 'refreshToken=invalid-token')
      .expect(498);

    const firstUser = await createTwoSessions({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    });
    const secondUser = await createTwoSessions({
      username: 'john_doe2',
      email: 'john.doe2@example.com',
      password: 'SecurePass12!',
      passwordConfirmation: 'SecurePass12!',
      isTermsAccepted: true,
    });

    // Получаем сессии первого юзера
    const firstUserSessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(200);
    expect(firstUserSessions.body).toHaveLength(2);

    // Получаем сессии второго юзера
    const secondUserSessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', secondUser.secondLogin.headers['set-cookie'])
      .expect(200);
    expect(secondUserSessions.body).toHaveLength(2);

    // Заряжаем токен 1 юзера и удаляем все сессии, кроме текущей, для 1 юзера
    await request(httpServer)
      .delete('/security/session')
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(204);

    // Достаём оставшуюся сессию для 1 юзера
    const deletedFirstUserSessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(200);

    expect(deletedFirstUserSessions.body).toHaveLength(1);
    expect(deletedFirstUserSessions.body).toEqual([
      {
        ip: expect.any(String),
        title: expect.any(String),
        lastActiveDate: expect.any(String),
        deviceId: firstUser.secondSession.id,
      },
    ]);

    // Проверяем, что сессии 2 пользователя не тронуты
    const sessionsForSecondUser = await request(httpServer)
      .get('/security/session')
      .set('Cookie', secondUser.secondLogin.headers['set-cookie'])
      .expect(200);
    expect(sessionsForSecondUser.body).toHaveLength(2);

    // Ломаный токен
  });

  it('Terminate a session by Id', async () => {
    await request(httpServer)
      .delete('/security/session/123')
      .set('Cookie', 'refreshToken=invalid-token')
      .expect(498);

    const firstUser = await createTwoSessions({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    });
    const secondUser = await createTwoSessions({
      username: 'john_doe2',
      email: 'john.doe2@example.com',
      password: 'SecurePass12!',
      passwordConfirmation: 'SecurePass12!',
      isTermsAccepted: true,
    });

    // Заряжаем токен 1 юзера, что бы уничтожить сессию 1 первого юзера
    // Первый, пытается удалить сессию второго
    await request(httpServer)
      .delete(`/security/session/${firstUser.secondSession.id}`)
      .set('Cookie', secondUser.secondLogin.headers['set-cookie'])
      .expect(403);

    // Не найдена такая сессия
    await request(httpServer)
      .delete(`/security/session/123`)
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(404);

    // Токен сломан

    // Проверяем сессии первого юзера, после удаления
    await request(httpServer)
      .delete(`/security/session/${firstUser.firstSession.id}`)
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(204);

    const firstUserSessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', firstUser.secondLogin.headers['set-cookie'])
      .expect(200);

    // Проверяем сессии второго юзера, после удаления, сессии первого юзера
    expect(firstUserSessions.body).toHaveLength(1);
    const secondUserSessions = await request(httpServer)
      .get('/security/session')
      .set('Cookie', secondUser.secondLogin.headers['set-cookie'])
      .expect(200);
    expect(secondUserSessions.body).toHaveLength(2);
  });
});
