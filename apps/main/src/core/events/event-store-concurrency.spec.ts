import { EventStoreService } from './event-store.service.js';
import { MongoEventRepository } from '../../../../files/src/events/mongo-event.repository.js';

jest.mock('../../infrastructure/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));
jest.mock('../../generated/prisma/client.js', () => ({
  Prisma: { DbNull: null },
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type Update = { where: Record<string, unknown>; data: Record<string, unknown> };

function harness(kind: string, count: number) {
  const events = Array.from({ length: count }, (_, index) => ({
    eventId: String(index),
    _id: String(index),
    attempts: 0,
  }));
  const claim = jest.fn((id: string) =>
    Promise.resolve(events.find((event) => event._id === id)),
  );
  const finish = jest
    .fn<Promise<{ count: number }>, [Update]>()
    .mockResolvedValue({ count: 1 });
  const query = jest.fn().mockResolvedValue(events);
  if (kind === 'main') {
    const repository = {
      findMany: query,
      updateMany: jest.fn(
        async (args: Update & { where: { eventId: string } }) => {
          if (args.data.status === 'PROCESSING') {
            return { count: (await claim(args.where.eventId)) ? 1 : 0 };
          }
          return finish(args);
        },
      ),
    };
    const service = new EventStoreService({ inboxEvent: repository } as never);
    return {
      run: (handle: () => Promise<void>) => service.run('inboxEvent', handle),
      claim,
      finish,
      query,
    };
  }
  const model = {
    find: jest.fn(() => ({
      sort: () => ({ limit: () => ({ exec: query }) }),
    })),
    findOneAndUpdate: jest.fn((where: { _id: string }) => ({
      exec: () => claim(where._id),
    })),
    updateOne: jest.fn(
      (
        where: Record<string, unknown>,
        update: { $set: Record<string, unknown> },
      ) => ({
        exec: () => finish({ where, data: update.$set }),
      }),
    ),
  };
  const repository = new MongoEventRepository(model as never);
  return {
    run: (handle: () => Promise<void>) => repository.run(handle),
    claim,
    finish,
    query,
  };
}

describe.each(['main', 'files'])('%s scheduler concurrency', (kind) => {
  it('starts all ten events before any finishes and prevents overlapping runs', async () => {
    const h = harness(kind, 10);
    const gate = deferred();
    const started = deferred();
    const handle = jest.fn(async () => {
      if (handle.mock.calls.length === 10) started.resolve();
      await gate.promise;
    });
    const running = h.run(handle);
    await started.promise;
    expect(handle).toHaveBeenCalledTimes(10);
    expect(h.finish).not.toHaveBeenCalled();
    await h.run(handle);
    expect(h.query).toHaveBeenCalledTimes(1);
    gate.resolve();
    await running;
    expect(h.finish).toHaveBeenCalledTimes(10);
    await h.run(async () => {});
    expect(h.query).toHaveBeenCalledTimes(2);
  });

  it('holds the guard after a claim error until other events finish', async () => {
    const h = harness(kind, 2);
    const error = new Error('database unavailable');
    h.claim.mockRejectedValueOnce(error);
    const gate = deferred();
    const started = deferred();
    const running = h.run(async () => {
      started.resolve();
      await gate.promise;
    });
    const rejection = expect(running).rejects.toThrow(error);
    await started.promise;
    await h.run(async () => {});
    expect(h.query).toHaveBeenCalledTimes(1);
    gate.resolve();
    await rejection;
    await h.run(async () => {});
    expect(h.query).toHaveBeenCalledTimes(2);
  });

  it('retries a failed event while completing successful events', async () => {
    const h = harness(kind, 2);
    const handle = jest
      .fn()
      .mockRejectedValueOnce(new Error('processing failed'))
      .mockResolvedValueOnce(undefined);
    await h.run(handle);
    const updates = h.finish.mock.calls.map(([args]) => args.data);
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'OK' }),
        expect.objectContaining({
          status: 'UNPROCESSED',
          lastError: 'processing failed',
          nextAttemptAt: expect.any(Date) as unknown,
        }),
      ]),
    );
  });
});
