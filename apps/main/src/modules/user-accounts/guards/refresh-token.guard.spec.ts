jest.mock('../repositories/sessionRepositories/sessions.repository.js', () => ({
  SessionsRepository: class SessionsRepository {},
}));

import { ExecutionContext } from '@nestjs/common';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { DomainException } from '../../../core/exceptions/domain-exception.js';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-code.js';
import { RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { SessionsRepository } from '../repositories/sessionRepositories/sessions.repository.js';
import { RefreshTokenGuard } from './refresh-token.guard.js';

describe('RefreshTokenGuard', () => {
  const payload = { userId: 'user-1', sessionId: 'session-1', iat: 1, exp: 2 };

  const createContext = (request: Partial<RequestWithUser>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;

  it('allows a valid token tied to an active session and exposes its full payload', async () => {
    const jwtAdapter = {
      verifyRefreshToken: jest.fn().mockResolvedValue(payload),
    } as unknown as JwtAdapter;
    const sessionsRepository = {
      findById: jest.fn().mockResolvedValue({ userId: payload.userId }),
    } as unknown as SessionsRepository;
    const request = { cookies: { refreshToken: 'valid-token' } } as Partial<RequestWithUser>;

    await expect(
      new RefreshTokenGuard(jwtAdapter, sessionsRepository).canActivate(
        createContext(request),
      ),
    ).resolves.toBe(true);

    expect(sessionsRepository.findById).toHaveBeenCalledWith('session-1');
    expect(request.user).toEqual(payload);
  });

  it.each([
    ['missing token', undefined, undefined],
    ['revoked session', 'valid-token', null],
    ['session owned by another user', 'valid-token', { userId: 'user-2' }],
  ])('rejects a %s with an unauthorized domain exception', async (scenario, token, session) => {
    const jwtAdapter = {
      verifyRefreshToken: jest.fn().mockResolvedValue(payload),
    } as unknown as JwtAdapter;
    const sessionsRepository = {
      findById: jest.fn().mockResolvedValue(session),
    } as unknown as SessionsRepository;
    const request = { cookies: token ? { refreshToken: token } : {} } as Partial<RequestWithUser>;

    await expect(
      new RefreshTokenGuard(jwtAdapter, sessionsRepository).canActivate(
        createContext(request),
      ),
    ).rejects.toMatchObject({
      code: DomainExceptionCode.Unauthorized,
    } as DomainException);
  });

  it('propagates an error thrown by JwtAdapter', async () => {
    const jwtError = new Error('expired token');
    const jwtAdapter = {
      verifyRefreshToken: jest.fn().mockRejectedValue(jwtError),
    } as unknown as JwtAdapter;
    const sessionsRepository = {
      findById: jest.fn(),
    } as unknown as SessionsRepository;

    await expect(
      new RefreshTokenGuard(jwtAdapter, sessionsRepository).canActivate(
        createContext({ cookies: { refreshToken: 'expired-token' } }),
      ),
    ).rejects.toBe(jwtError);
  });
});
