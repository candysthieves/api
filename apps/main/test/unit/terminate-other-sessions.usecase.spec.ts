jest.mock(
  '../../src/modules/user-accounts/repositories/sessionRepositories/sessions.repository.js',
  () => ({
    SessionsRepository: class SessionsRepository {},
  }),
);

import { SessionsRepository } from '../../src/modules/user-accounts/repositories/sessionRepositories/sessions.repository.js';
import {
  DeleteOtherSessionsCommand,
  DeleteOtherSessionsUseCase,
} from '../../src/modules/user-accounts/application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';

describe('DeleteOtherSessionsUsecase', () => {
  it('terminates all sessions except the current session', async () => {
    const sessionsRepository = {
      deleteOtherSessions: jest.fn(),
    } as unknown as SessionsRepository;
    const useCase = new DeleteOtherSessionsUseCase(sessionsRepository);

    await useCase.execute(
      new DeleteOtherSessionsCommand('user-1', 'session-1'),
    );

    expect(sessionsRepository.deleteOtherSessions).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
  });
});
