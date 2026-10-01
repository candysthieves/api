import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from '../env/environment.js';
import { MongoEventRepository } from './mongo-event.repository.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('post image concurrency', () => {
  it.each([1, 5, 7])(
    'processes at most %i images and leaves the rest for the next run',
    async (concurrency) => {
      const pending = Array.from({ length: concurrency + 2 }, (_, id) => ({
        _id: String(id),
        attempts: 0,
      }));
      const model = {
        find: jest.fn(() => ({
          sort: () => ({
            limit: (count: number) => ({
              exec: () => Promise.resolve(pending.slice(0, count)),
            }),
          }),
        })),
        findOneAndUpdate: (where: { _id: string }) => ({
          exec: () =>
            Promise.resolve(pending.find((event) => event._id === where._id)),
        }),
        updateOne: (where: { _id: string }) => ({
          exec: () => {
            pending.splice(
              pending.findIndex((event) => event._id === where._id),
              1,
            );
            return Promise.resolve();
          },
        }),
      };
      const repository = new MongoEventRepository(model as never);
      const gate = deferred();
      const started = deferred();
      const handle = jest.fn(async () => {
        if (handle.mock.calls.length === concurrency) started.resolve();
        await gate.promise;
      });
      const running = repository.run(handle, concurrency);
      try {
        await started.promise;
        expect(handle).toHaveBeenCalledTimes(concurrency);
        await repository.run(handle, concurrency);
        expect(model.find).toHaveBeenCalledTimes(1);
      } finally {
        gate.resolve();
        await running;
      }
      expect(pending).toHaveLength(2);
      const next = jest.fn().mockResolvedValue(undefined);
      await repository.run(next, concurrency);
      expect(next).toHaveBeenCalledTimes(Math.min(2, concurrency));
    },
  );

  it('defaults to five and converts the env string to a number', () => {
    expect(
      plainToInstance(EnvironmentVariables, {}).POST_IMAGE_CONCURRENCY,
    ).toBe(5);
    const env = plainToInstance(EnvironmentVariables, {
      POST_IMAGE_CONCURRENCY: '3',
    });
    expect(env.POST_IMAGE_CONCURRENCY).toBe(3);
    expect(
      validateSync(env).filter(
        (error) => error.property === 'POST_IMAGE_CONCURRENCY',
      ),
    ).toEqual([]);
  });

  it.each(['0', '-1', '1.5', 'invalid', '', 'Infinity'])(
    'rejects invalid env value %s',
    (value) => {
      const env = plainToInstance(EnvironmentVariables, {
        POST_IMAGE_CONCURRENCY: value,
      });
      expect(
        validateSync(env).some(
          (error) => error.property === 'POST_IMAGE_CONCURRENCY',
        ),
      ).toBe(true);
    },
  );
});
