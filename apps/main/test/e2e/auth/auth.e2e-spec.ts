import { type ExecutionContext, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module.js';
import { setupApp } from '../../../src/setup/app-setup.js';
import { expect, jest } from '@jest/globals';
import { EmailAdapter } from '../../../src/core/adapters/email/email.adapter.js';
import request from 'supertest';
import { RegistrationDto } from '../../../src/modules/user-accounts/api/dto/registration.dto.js';
import { RecaptchaService } from '../../../src/core/services/recaptcha.service.js';
import { GoogleAuthGuard } from '../../../src/modules/user-accounts/api/guards/google-auth.guard.js';
import { GithubAuthGuard } from '../../../src/modules/user-accounts/api/guards/github-auth.guard.js';
import { OAuthProfileDto } from '../../../src/modules/user-accounts/api/dto/oauth-profile.dto.js';

const googleProfile: OAuthProfileDto = {
  provider: 'google',
  providerId: 'google-user-1',
  email: 'google.user@example.com',
  firstName: 'Google User',
};

const githubProfile: OAuthProfileDto = {
  provider: 'github',
  providerId: 'github-user-1',
  email: 'github.user@example.com',
  firstName: 'GitHub User',
};

function createOAuthGuard(profile: OAuthProfileDto) {
  return {
    canActivate(context: ExecutionContext): boolean {
      const request = context
        .switchToHttp()
        .getRequest<{ user: OAuthProfileDto }>();
      request.user = profile;

      return true;
    },
  };
}

describe('Auth e2e tests', () => {
  let app: INestApplication;
  let httpServer: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue(createOAuthGuard(googleProfile))
      .overrideGuard(GithubAuthGuard)
      .useValue(createOAuthGuard(githubProfile))
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    httpServer = app.getHttpServer();
    prisma = app.get<PrismaService>(PrismaService);
    jest.spyOn(EmailAdapter.prototype, 'sendEmail').mockResolvedValue();
    jest
      .spyOn(RecaptchaService.prototype, 'verifyPasswordRecovery')
      .mockResolvedValue();
  });

  beforeEach(async () => {
    await request(httpServer).delete('/api/v1/testing/all-data').expect(204);
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerAndConfirmUser(inputDto: RegistrationDto) {
    await request(httpServer)
      .post('/api/v1/auth/registration')
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
      .post('/api/v1/auth/registration-confirmation')
      .send({ code: user.confirmationCode })
      .expect(204);

    return user;
  }

  async function loginUser(
    inputDto: Pick<RegistrationDto, 'email' | 'password'>,
  ) {
    return request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        email: inputDto.email,
        password: inputDto.password,
      })
      .expect(200);
  }

  it('Registration in system', async () => {
    const badRequest = await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe2',
        email: 'john.doe2@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'wrong-securePass1!',
        isTermsAccepted: true,
      })
      .expect(400);

    expect(badRequest.body).toEqual({
      code: 53,
      errorsMessages: [
        {
          field: 'passwordConfirmation',
          message: 'Passwords must match',
        },
      ],
    });

    // Регаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'SecurePass1!',
        isTermsAccepted: true,
      })
      .expect(201);

    // Проверяем, что он рил есть
    const user = await prisma.user.findUnique({
      where: { email: 'john.doe@example.com' },
    });
    expect(user).not.toBeNull();

    // Ломаем совпадение паролей
  });

  it('Confirm registration', async () => {
    // Регаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'SecurePass1!',
        isTermsAccepted: true,
      })
      .expect(201);

    //Достали юзера и его код
    const user = await prisma.user.findUnique({
      where: { email: 'john.doe@example.com' },
      select: { confirmationCode: true },
    });
    expect(user).not.toBeNull();

    // Ломаный код
    const badRequest = await request(httpServer)
      .post('/api/v1/auth/registration-confirmation')
      .send({
        code: '00000000-0000-4000-8000-000000000001',
      })
      .expect(400);

    expect(badRequest.body).toEqual({
      code: 41,
      errorsMessages: [{ field: 'code', message: 'Invalid confirmation code' }],
    });

    // Подтверждаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration-confirmation')
      .send({
        code: user!.confirmationCode,
      })
      .expect(204);

    // Проверяем, что подтвердился
    const confirmedUser = await prisma.user.findUnique({
      where: { email: 'john.doe@example.com' },
      select: { isEmailConfirmed: true },
    });

    expect(confirmedUser!.isEmailConfirmed).toEqual(true);
  });

  it('Try to login to the system', async () => {
    // Регаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'SecurePass1!',
        isTermsAccepted: true,
      })
      .expect(201);

    const badRequest = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'dasdasdadsasdadadsadasadsdassaddsa!',
      })
      .expect(400);

    expect(badRequest.body).toEqual({
      code: 50,
      errorsMessages: [
        {
          field: 'password',
          message: 'password must be shorter than or equal to 20 characters',
        },
      ],
    });

    // Юзер не подтверждён
    await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
      })
      .expect(401);

    //Достаём код юзера
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { confirmationCode: true },
    });
    // Подтверждаем юзера кодом
    await request(httpServer)
      .post('/api/v1/auth/registration-confirmation')
      .send({ code: user.confirmationCode })
      .expect(204);

    const result = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
      })
      .expect(200);

    expect(result.body).toEqual({
      accessToken: expect.any(String),
    });
  });

  it('Generate new pair token', async () => {
    await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', 'refreshToken=wrong-refresh-token')
      .expect(498);

    // Регаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'SecurePass1!',
        isTermsAccepted: true,
      })
      .expect(201);

    //Достали юзера и его код
    const user = await prisma.user.findUnique({
      where: { email: 'john.doe@example.com' },
      select: { confirmationCode: true },
    });
    expect(user).not.toBeNull();

    // Подтверждаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration-confirmation')
      .send({
        code: user!.confirmationCode,
      })
      .expect(204);

    // Логинимся
    const loginedUser = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
      })
      .expect(200);

    // Ломаный токен
    const oldRefreshCookie = loginedUser.headers['set-cookie'];
    await new Promise((resolve) => setTimeout(resolve, 1_100));

    const newPairToken = await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', oldRefreshCookie)
      .expect(200);

    expect(newPairToken.body).toEqual({
      accessToken: expect.any(String),
    });
    //Проверка, что обновился токен в куках
    expect(newPairToken.headers['set-cookie']).toBeDefined();

    await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', oldRefreshCookie)
      .expect(401);

    await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', newPairToken.headers['set-cookie'])
      .expect(200);
  });

  it('Resend confirmation registration Email', async () => {
    const incorrectEmail = await request(httpServer)
      .post('/api/v1/auth/resend-confirmation-email')
      .send({ email: 'incorrect@example.com' })
      .expect(400);

    expect(incorrectEmail.body).toEqual({
      code: 21,
      errorsMessages: [{ field: 'email', message: 'Incorrect email' }],
    });

    // Регаем юзера
    await request(httpServer)
      .post('/api/v1/auth/registration')
      .send({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'SecurePass1!',
        passwordConfirmation: 'SecurePass1!',
        isTermsAccepted: true,
      })
      .expect(201);

    // Достаём старый код подтверждения
    const userBeforeResend = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { confirmationCode: true },
    });

    // Запрашиваем повторную отправку email
    await request(httpServer)
      .post('/api/v1/auth/resend-confirmation-email')
      .send({ email: 'john.doe@example.com' })
      .expect(204);

    // Достаём новый код подтверждения
    const userAfterResend = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { confirmationCode: true },
    });

    // Новый код должен отличаться от старого
    expect(userAfterResend.confirmationCode).not.toBe(
      userBeforeResend.confirmationCode,
    );

    // Подтверждаем регистрацию новым кодом
    await request(httpServer)
      .post('/api/v1/auth/registration-confirmation')
      .send({ code: userAfterResend.confirmationCode })
      .expect(204);

    // Несуществующий email
    // Уже подтверждённый email
    const confirmedEmail = await request(httpServer)
      .post('/api/v1/auth/resend-confirmation-email')
      .send({ email: 'john.doe@example.com' })
      .expect(400);

    expect(confirmedEmail.body).toEqual({
      code: 20,
      errorsMessages: [{ field: 'email', message: 'Email already confirmed' }],
    });
  });

  it('Send password recovery code', async () => {
    const incorrectEmail = await request(httpServer)
      .post('/api/v1/auth/password-recovery')
      .send({
        email: 'incorrect@example.com',
        recaptchaToken: 'valid-recaptcha-token',
      })
      .expect(400);

    expect(incorrectEmail.body).toEqual({
      code: 21,
      errorsMessages: [
        { field: 'email', message: "User with this email doesn't exist" },
      ],
    });

    // Регистрируем и подтверждаем юзера
    await registerAndConfirmUser({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    });

    // Запрашиваем код для восстановления пароля
    await request(httpServer)
      .post('/api/v1/auth/password-recovery')
      .send({
        email: 'john.doe@example.com',
        recaptchaToken: 'valid-recaptcha-token',
      })
      .expect(204);

    // Проверяем, что код появился в базе
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { passwordRecoveryCode: true },
    });

    expect(user.passwordRecoveryCode).toEqual(expect.any(String));

    // Несуществующий email
  });

  it('Validate password recovery code', async () => {
    // Регистрируем и подтверждаем юзера
    await registerAndConfirmUser({
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    });

    // Запрашиваем код для восстановления пароля
    await request(httpServer)
      .post('/api/v1/auth/password-recovery')
      .send({
        email: 'john.doe@example.com',
        recaptchaToken: 'valid-recaptcha-token',
      })
      .expect(204);

    // Достаём новый код из базы
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { passwordRecoveryCode: true },
    });

    // Валидный код проходит проверку
    await request(httpServer)
      .get('/api/v1/auth/password-recovery/validate')
      .query({ recoveryCode: user.passwordRecoveryCode })
      .expect(204);

    // Несуществующий код не проходит проверку
    const incorrectRecoveryCode = await request(httpServer)
      .get('/api/v1/auth/password-recovery/validate')
      .query({ recoveryCode: '00000000-0000-4000-8000-000000000001' })
      .expect(400);

    expect(incorrectRecoveryCode.body).toEqual({
      code: 43,
      errorsMessages: [
        { field: 'recoveryCode', message: 'Invalid recovery code' },
      ],
    });

    // Невалидный UUID
    await request(httpServer)
      .get('/api/v1/auth/password-recovery/validate')
      .query({ recoveryCode: 'wrong-recovery-code' })
      .expect(400);

    // Делаем recovery code истёкшим
    await prisma.user.update({
      where: { email: 'john.doe@example.com' },
      data: { passwordRecoveryExpiresAt: new Date(Date.now() - 1_000) },
    });

    // Истёкший код не проходит проверку
    const expiredRecoveryCode = await request(httpServer)
      .get('/api/v1/auth/password-recovery/validate')
      .query({ recoveryCode: user.passwordRecoveryCode })
      .expect(400);

    expect(expiredRecoveryCode.body).toEqual({
      code: 42,
      errorsMessages: [
        { field: 'recoveryCode', message: 'Recovery code has expired' },
      ],
    });
  });

  it('Set new password', async () => {
    // Регистрируем и подтверждаем юзера
    const credentials = {
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    };
    await registerAndConfirmUser(credentials);
    await loginUser(credentials);
    const secondLogin = await loginUser(credentials);

    // Запрашиваем код для восстановления пароля
    await request(httpServer)
      .post('/api/v1/auth/password-recovery')
      .send({
        email: 'john.doe@example.com',
        recaptchaToken: 'valid-recaptcha-token',
      })
      .expect(204);

    // Достаём код из базы
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'john.doe@example.com' },
      select: { passwordRecoveryCode: true },
    });

    // Устанавливаем новый пароль
    await request(httpServer)
      .post('/api/v1/auth/new-password')
      .send({
        recoveryCode: user.passwordRecoveryCode,
        newPassword: 'NewSecurePass1!',
        newPasswordConfirmation: 'NewSecurePass1!',
      })
      .expect(204);

    // Старый пароль больше не работает
    await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'john.doe@example.com', password: 'SecurePass1!' })
      .expect(401);

    // Входим с новым паролем
    await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ email: 'john.doe@example.com', password: 'NewSecurePass1!' })
      .expect(200);

    // Все старые сессии сброшены
    await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', secondLogin.headers['set-cookie'])
      .expect(401);
  });

  it('Logout from the system', async () => {
    await request(httpServer)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refreshToken=wrong-refresh-token')
      .expect(498);

    // Регистрируем, подтверждаем и логинимся
    const credentials = {
      username: 'john_doe',
      email: 'john.doe@example.com',
      password: 'SecurePass1!',
      passwordConfirmation: 'SecurePass1!',
      isTermsAccepted: true,
    };
    await registerAndConfirmUser(credentials);
    await loginUser(credentials);
    const secondLogin = await loginUser(credentials);

    // Ломаный refresh token
    // Выходим из системы с валидным refresh token
    const logoutResponse = await request(httpServer)
      .post('/api/v1/auth/logout')
      .set('Cookie', secondLogin.headers['set-cookie'])
      .expect(204);

    // Проверяем, что refresh token очищен из cookie
    expect(logoutResponse.headers['set-cookie']?.[0]).toContain(
      'refreshToken=;',
    );

    // После logout сессия удалена, поэтому старый refresh token не работает
    await request(httpServer)
      .post('/api/v1/auth/refresh-token')
      .set('Cookie', secondLogin.headers['set-cookie'])
      .expect(401);
  });

  async function expectOAuthCallback(
    callbackPath: string,
    profile: OAuthProfileDto,
  ): Promise<void> {
    const response = await request(httpServer).get(callbackPath).expect(302);

    expect(response.headers.location).toBe(
      'http://localhost:3000/oauth/success',
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^refreshToken=/)]),
    );

    const user = await prisma.user.findUnique({
      where: { email: profile.email },
    });
    expect(user).not.toBeNull();
    expect(user?.isEmailConfirmed).toBe(true);

    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: {
        provider: profile.provider,
        providerId: profile.providerId,
        userId: user?.id,
      },
    });
    expect(oauthAccount).not.toBeNull();

    await request(httpServer).get(callbackPath).expect(302);

    expect(await prisma.user.count({ where: { email: profile.email } })).toBe(
      1,
    );
    expect(
      await prisma.oAuthAccount.count({
        where: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      }),
    ).toBe(1);
  }

  it('Sign in a new and existing user with Google OAuth', async () => {
    await expectOAuthCallback('/api/v1/auth/google/callback', googleProfile);
  });

  it('Sign in a new and existing user with GitHub OAuth', async () => {
    await expectOAuthCallback('/api/v1/auth/github/callback', githubProfile);
  });
});
