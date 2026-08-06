jest.mock(
  '../repositories/session-repositories/sessions.repository.js',
  () => ({
    SessionsRepository: class SessionsRepository {},
  }),
);

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { SessionEntity } from '../domain/entities/session.entity.js';
import { SessionsRepository } from '../repositories/session-repositories/sessions.repository.js';
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
      findActiveById: jest.fn().mockResolvedValue({ userId: payload.userId }),
    } as unknown as SessionsRepository;
    const request = {
      cookies: { refreshToken: 'valid-token' },
    } as Partial<RequestWithUser>;

    await expect(
      new RefreshTokenGuard(jwtAdapter, sessionsRepository).canActivate(
        createContext(request),
      ),
    ).resolves.toBe(true);

    expect(sessionsRepository.findActiveById).toHaveBeenCalledWith('session-1');
    expect(request.user).toEqual(payload);
  });

  it.each([
    ['missing token', undefined, undefined],
    ['expired token', 'expired-token', new UnauthorizedException()],
    ['revoked session', 'valid-token', undefined],
    ['session owned by another user', 'valid-token', undefined],
  ])('rejects a %s', async (scenario, token, jwtError) => {
    const jwtAdapter = {
      verifyRefreshToken: jest.fn().mockImplementation(() => {
        if (jwtError) {
          throw jwtError;
        }
        return Promise.resolve(payload);
      }),
    } as unknown as JwtAdapter;
    const session =
      scenario === 'session owned by another user'
        ? ({ userId: 'user-2' } as SessionEntity)
        : null;
    const sessionsRepository = {
      findActiveById: jest.fn().mockResolvedValue(session),
    } as unknown as SessionsRepository;
    const request = {
      cookies: token ? { refreshToken: token } : {},
    } as Partial<RequestWithUser>;

    await expect(
      new RefreshTokenGuard(jwtAdapter, sessionsRepository).canActivate(
        createContext(request),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
