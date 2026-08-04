jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/registration.usecase.js',
  () => ({ RegistrationCommand: class RegistrationCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/login.usecase.js',
  () => ({ LoginCommand: class LoginCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/logout.usecase.js',
  () => ({ LogoutCommand: class LogoutCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/refresh-token,usecase.js',
  () => ({ RefreshTokenCommand: class RefreshTokenCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/confirm-email.usecase.js',
  () => ({ ConfirmEmailCommand: class ConfirmEmailCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/resend-email.usecase.js',
  () => ({ ResendEmailCommand: class ResendEmailCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/password-recovery.usecase.js',
  () => ({
    PasswordRecoveryCommand: class PasswordRecoveryCommand {
      constructor(public readonly email: string) {}
    },
  }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/validate-password-recovery-code.usecase.js',
  () => ({
    ValidatePasswordRecoveryCodeCommand: class ValidatePasswordRecoveryCodeCommand {},
  }),
);
jest.mock(
  '../../src/modules/user-accounts/application/use-cases/auth-use-cases/new-password.usecase.js',
  () => ({ NewPasswordCommand: class NewPasswordCommand {} }),
);
jest.mock(
  '../../src/modules/user-accounts/guards/refresh-token.guard.js',
  () => ({ RefreshTokenGuard: class RefreshTokenGuard {} }),
);

import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppConfig } from '../../src/app.config.js';
import { RecaptchaService } from '../../src/core/services/recaptcha.service.js';
import { DomainException } from '../../src/core/exceptions/domain-exception.js';
import { DomainExceptionCode } from '../../src/core/exceptions/domain-exception-code.js';
import { AuthController } from '../../src/modules/user-accounts/api/auth.controller.js';
import { PasswordRecoveryDto } from '../../src/modules/user-accounts/dto/password-recovery.dto.js';

const validGoogleResponse = {
  success: true,
  hostname: 'example.com',
};

describe('RecaptchaService', () => {
  const config = {
    recaptchaSecretKey: 'secret',
    recaptchaAllowedHostnames: new Set(['example.com']),
  } as AppConfig;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts a successful v2 Checkbox response from an allowed hostname', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(validGoogleResponse), { status: 200 }),
    );
    const service = new RecaptchaService(config);

    await expect(
      service.verifyPasswordRecovery('token'),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each([
    ['wrong hostname', { ...validGoogleResponse, hostname: 'attacker.test' }],
    ['unsuccessful verification', { ...validGoogleResponse, success: false }],
  ])('rejects %s', async (_description, response) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(
      new RecaptchaService(config).verifyPasswordRecovery('token'),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects Google network errors and timeouts', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    await expect(
      new RecaptchaService(config).verifyPasswordRecovery('token'),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it.each([
    ['a non-successful HTTP response', new Response(null, { status: 500 })],
    ['an invalid JSON response', new Response('not json', { status: 200 })],
  ])('rejects %s from Google', async (_description, response) => {
    fetchMock.mockResolvedValue(response);

    await expect(
      new RecaptchaService(config).verifyPasswordRecovery('token'),
    ).rejects.toBeInstanceOf(DomainException);
  });
});

describe('password recovery CAPTCHA gate', () => {
  it('requires recaptchaToken in the request DTO', async () => {
    const dto = plainToInstance(PasswordRecoveryDto, {
      email: 'user@example.com',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'recaptchaToken')).toBe(
      true,
    );
  });

  it('does not dispatch password recovery when CAPTCHA verification fails', async () => {
    const execute = jest.fn();
    const commandBus = { execute } as unknown as CommandBus;
    const verifyPasswordRecovery = jest
      .fn()
      .mockRejectedValue(
        new DomainException(DomainExceptionCode.Forbidden, [
          { field: '', message: 'reCAPTCHA verification failed.' },
        ]),
      );
    const recaptchaService = {
      verifyPasswordRecovery,
    } as unknown as RecaptchaService;
    const controller = new AuthController(
      commandBus,
      {} as never,
      recaptchaService,
    );

    await expect(
      controller.passwordRecovery({
        email: 'user@example.com',
        recaptchaToken: 'token',
      }),
    ).rejects.toBeInstanceOf(DomainException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('dispatches the existing password recovery command after CAPTCHA succeeds', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const commandBus = { execute } as unknown as CommandBus;
    const verifyPasswordRecovery = jest.fn().mockResolvedValue(undefined);
    const recaptchaService = {
      verifyPasswordRecovery,
    } as unknown as RecaptchaService;
    const controller = new AuthController(
      commandBus,
      {} as never,
      recaptchaService,
    );

    await controller.passwordRecovery({
      email: 'user@example.com',
      recaptchaToken: 'token',
    });

    expect(verifyPasswordRecovery).toHaveBeenCalledWith('token');
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' }),
    );
  });
});
