import {
  CommandHandler,
  ICommandHandler,
  QueryHandler,
  IQueryHandler,
} from '@nestjs/cqrs';
import { SubscriptionNotificationsRepository } from '../../infrastructure/repositories/subscription-notifications/subscription-notifications.repository.js';

export class GetPendingSubscriptionNotificationsQuery {
  constructor(public readonly limit: number) {}
}

@QueryHandler(GetPendingSubscriptionNotificationsQuery)
export class GetPendingSubscriptionNotificationsHandler implements IQueryHandler<GetPendingSubscriptionNotificationsQuery> {
  constructor(
    private readonly notifications: SubscriptionNotificationsRepository,
  ) {}

  /** Возвращает ожидающие уведомления с ограничением размера выборки. */
  execute({ limit }: GetPendingSubscriptionNotificationsQuery) {
    return this.notifications.findPending(Math.min(Math.max(limit, 1), 100));
  }
}

export class AcknowledgeSubscriptionNotificationCommand {
  constructor(public readonly notificationId: string) {}
}

@CommandHandler(AcknowledgeSubscriptionNotificationCommand)
export class AcknowledgeSubscriptionNotificationUseCase implements ICommandHandler<
  AcknowledgeSubscriptionNotificationCommand,
  void
> {
  constructor(
    private readonly notifications: SubscriptionNotificationsRepository,
  ) {}

  /** Помечает уведомление доставленным после подтверждения. */
  async execute({
    notificationId,
  }: AcknowledgeSubscriptionNotificationCommand): Promise<void> {
    await this.notifications.markDelivered(notificationId, new Date());
  }
}
