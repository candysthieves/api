jest.mock('../../../../infrastructure/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { SessionsRepository } from './sessions.repository.js';

describe('SessionsRepository', () => {
  const prisma = {
    session: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;
  const repository = new SessionsRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('soft-deletes a session by setting deletedAt', async () => {
    await repository.deleteById('session-1', 'user-1');

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('does not find a soft-deleted session as active', async () => {
    await repository.findActiveById('session-1');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'session-1',
        expiresAt: { gt: expect.any(Date) },
        deletedAt: null,
      },
    });
  });
});
