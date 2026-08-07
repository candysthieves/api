jest.mock(
  '../../src/modules/user-accounts/guards/refresh-token.guard.js',
  () => ({
    RefreshTokenGuard: class RefreshTokenGuard {},
  }),
);

jest.mock(
  '../../src/modules/user-accounts/application/query-handler/sessions/find-sessions-query-handler.js',
  () => ({
    FindAllSessionsQuery: class FindAllSessionsQuery {
      constructor(public readonly refreshToken: string) {}
    },
  }),
);

jest.mock(
  '../../src/modules/user-accounts/application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js',
  () => ({
    DeleteOtherSessionsCommand: class DeleteOtherSessionsCommand {
      constructor(
        public readonly userId: string,
        public readonly currentSessionId: string,
      ) {}
    },
  }),
);

jest.mock(
  '../../src/modules/user-accounts/application/use-cases/sessions-use-cases/deactivate-session.usecase.js',
  () => ({
    DeactivateSessionCommand: class DeactivateSessionCommand {},
  }),
);

import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CookieAdapter } from '../../src/core/adapters/cookie.adapter.js';
import type { JwtRefreshPayload } from '../../src/core/types/jwt-payload.type.js';
import { SessionsController } from '../../src/modules/user-accounts/api/sessions.controller.js';

describe('SessionsController', () => {
  it('dispatches termination of every session except the current one', async () => {
    const queryBus = { execute: jest.fn() } as unknown as QueryBus;
    const commandBus = { execute: jest.fn() } as unknown as CommandBus;
    const cookieAdapter = {
      clearRefreshCookie: jest.fn(),
    } as unknown as CookieAdapter;
    const controller = new SessionsController(queryBus, commandBus, cookieAdapter);
    const user: JwtRefreshPayload = {
      userId: 'user-1',
      sessionId: 'session-1',
      iat: 1,
      exp: 2,
    };

    await controller.deleteOtherSessions(user);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        currentSessionId: 'session-1',
      }),
    );
  });
});
