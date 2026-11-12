import { NotificationsScheduler } from './notifications.scheduler.js';

describe('NotificationsScheduler', () => {
  const scheduled = {
    findDueIds: jest.fn(),
    materialize: jest.fn(),
    complete: jest.fn<Promise<void>, [string, number]>(),
    fail: jest.fn(),
  };
  const delivery = { deliver: jest.fn() };
  const scheduler = new NotificationsScheduler(
    scheduled as unknown as ConstructorParameters<
      typeof NotificationsScheduler
    >[0],
    delivery as unknown as ConstructorParameters<
      typeof NotificationsScheduler
    >[1],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    scheduled.findDueIds.mockResolvedValue(['first', 'second']);
    scheduled.materialize.mockImplementation((id: string) =>
      Promise.resolve({ id }),
    );
    delivery.deliver.mockResolvedValue(undefined);
  });

  it('materializes and completes notifications when the delivery boundary reports offline success', async () => {
    await scheduler.execute();
    expect(scheduled.complete.mock.calls.map(([id]) => id)).toEqual([
      'first',
      'second',
    ]);
    expect(scheduled.fail).not.toHaveBeenCalled();
    expect(scheduled.materialize.mock.invocationCallOrder[0]).toBeLessThan(
      delivery.deliver.mock.invocationCallOrder[0],
    );
  });

  it('does not deliver or complete a notification disabled or removed after selection', async () => {
    scheduled.materialize.mockResolvedValue(null);
    await scheduler.execute();
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(scheduled.complete).not.toHaveBeenCalled();
  });

  it('retains failed notifications for retry and continues with other notifications', async () => {
    const error = new Error('main unavailable');
    delivery.deliver.mockRejectedValueOnce(error);
    await scheduler.execute();
    expect(scheduled.fail).toHaveBeenCalledWith(
      'first',
      expect.any(Number),
      error,
    );
    expect(scheduled.complete).toHaveBeenCalledWith(
      'second',
      expect.any(Number),
    );
    expect(scheduled.complete).not.toHaveBeenCalledWith(
      'first',
      expect.any(Number),
    );
  });
});
