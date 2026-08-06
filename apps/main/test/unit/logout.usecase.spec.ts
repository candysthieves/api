jest.mock(
  '../../src/modules/user-accounts/repositories/session-repositories/sessions.repository.js',
  () => ({
    SessionsRepository: class SessionsRepository {},
  }),
);

import {
  LogoutCommand,
  LogoutUseCase,
} from '../../src/modules/user-accounts/application/use-cases/auth-use-cases/logout.usecase.js';
import { SessionsRepository } from '../../src/modules/user-accounts/repositories/session-repositories/sessions.repository.js';

describe('LogoutUseCase', () => {
  it('deletes only the session from the refresh-token payload', async () => {
    const sessionsRepository = {
      deleteById: jest.fn().mockResolvedValue(undefined),
    } as unknown as SessionsRepository;
    const useCase = new LogoutUseCase(sessionsRepository);

    await useCase.execute(
      new LogoutCommand({
        userId: 'user-1',
        sessionId: 'session-1',
        iat: 1,
        exp: 2,
      }),
    );

    expect(sessionsRepository.deleteById).toHaveBeenCalledWith('session-1');
    expect(sessionsRepository.deleteById).toHaveBeenCalledTimes(1);
  });
});
