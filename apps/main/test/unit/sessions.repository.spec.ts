jest.mock('../../src/infrastructure/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';
import { SessionsRepository } from '../../src/modules/user-accounts/infrastructure/repositories/session-repositories/sessions.repository.js';

describe('SessionsRepository', () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const updateMany = jest.fn();
  const anyDate = (): Date =>
    ({
      asymmetricMatch: (value: unknown): boolean => value instanceof Date,
    }) as unknown as Date;
  const prisma = {
    session: {
      findFirst,
      update,
      updateMany,
    },
  } as unknown as PrismaService;
  const repository = new SessionsRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('soft-deletes a session by setting deletedAt', async () => {
    await repository.deleteById('session-1', 'user-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1', deletedAt: null },
      data: { deletedAt: anyDate() },
    });
  });

  it('does not find a soft-deleted session as active', async () => {
    await repository.findActiveById('session-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        expiresAt: { gt: anyDate() },
        deletedAt: null,
      },
    });
  });

  it('soft-deletes every other active session of the user', async () => {
    await repository.deleteOtherSessions('user-1', 'session-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        id: { not: 'session-1' },
        deletedAt: null,
      },
      data: { deletedAt: anyDate() },
    });
  });
});
