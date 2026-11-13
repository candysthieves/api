import {
  ReplacePaymentNotificationsCommand,
  ReplacePaymentNotificationsUseCase,
} from './replace-payment-notifications.usecase.js';
import { ScheduledNotificationsRepository } from '../../infrastructure/repositories/scheduled-notifications.repository.js';
import { ScheduledNotificationFactory } from '../factories/scheduled-notification.factory.js';
import { NotificationTitle, NotificationType } from '@libs/contracts';

describe('ReplacePaymentNotificationsUseCase', () => {
  const repository = {
    findFutureByUserId: jest.fn(),
    deleteNotification: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new ReplacePaymentNotificationsUseCase(
    repository as unknown as ScheduledNotificationsRepository,
  );
  const notification = ScheduledNotificationFactory.create({
    eventId: 'event',
    consumer: 'NOTIFICATIONS',
    type: 'payment.notification.scheduled',
    data: {
      userId: '42',
      paymentId: 'new',
      subscriptionId: 'subscription',
      paidAt: 1000,
      executeAt: 2000,
      type: NotificationType.PAYMENT,
      title: NotificationTitle.PAYMENT_SUCCESSFUL,
      message: 'Paid',
    },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findFutureByUserId.mockResolvedValue([
      { key: 'old-key', paymentId: 'old' },
      { key: 'same-payment-key', paymentId: 'new' },
    ]);
  });

  it('replaces future notifications of other payments and preserves the same payment', async () => {
    await useCase.execute(new ReplacePaymentNotificationsCommand(notification));
    expect(repository.findFutureByUserId).toHaveBeenCalledWith(
      '42',
      expect.any(Number),
    );
    expect(repository.deleteNotification).toHaveBeenCalledTimes(1);
    expect(repository.deleteNotification).toHaveBeenCalledWith('old-key', '42');
    expect(repository.save).toHaveBeenCalledWith(notification);
    expect(
      repository.deleteNotification.mock.invocationCallOrder[0],
    ).toBeLessThan(repository.save.mock.invocationCallOrder[0]);
  });

  it('does not save a new schedule when replacement fails', async () => {
    repository.deleteNotification.mockRejectedValue(new Error('delete failed'));
    await expect(
      useCase.execute(new ReplacePaymentNotificationsCommand(notification)),
    ).rejects.toThrow('delete failed');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
