import { NotificationsScheduler } from './notifications.scheduler.js';

describe('NotificationsScheduler', () => {
  const scheduled = {
    findDueIds: jest.fn(),
    findById: jest.fn(),
    removeFromQueue: jest.fn(),
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
    scheduled.findById.mockImplementation((id: string) =>
      Promise.resolve({ id }),
    );
    delivery.deliver.mockResolvedValue(undefined);
  });

  it('findByIds notifications and removes them from the queue when the delivery boundary reports offline success', async () => {
    await scheduler.execute();
    expect(scheduled.removeFromQueue.mock.calls.map(([id]) => id)).toEqual([
      'first',
      'second',
    ]);
    expect(scheduled.findById.mock.invocationCallOrder[0]).toBeLessThan(
      delivery.deliver.mock.invocationCallOrder[0],
    );
  });

  it('does not deliver a notification removed after selection', async () => {
    scheduled.findById.mockResolvedValue(null);
    await scheduler.execute();
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(scheduled.removeFromQueue).toHaveBeenCalledTimes(2);
  });

  it('removes failed notifications from the queue and continues with other notifications', async () => {
    const error = new Error('main unavailable');
    delivery.deliver.mockRejectedValueOnce(error);
    await scheduler.execute();
    expect(scheduled.removeFromQueue).toHaveBeenCalledWith('first');
    expect(scheduled.removeFromQueue).toHaveBeenCalledWith('second');
    expect(scheduled.removeFromQueue).toHaveBeenCalledTimes(2);
  });
});
