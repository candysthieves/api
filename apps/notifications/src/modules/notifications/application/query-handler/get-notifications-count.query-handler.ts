import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotificationsRepository } from '../../infrastructure/repositories/notifications.repository.js';
import { NotificationsMapper } from '../../api/mappers/notifications.mapper.js';
import { NotificationsCountViewType } from '../../api/view-types/notifications-count-view.type.js';

export class GetNotificationsCountQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetNotificationsCountQuery)
export class GetNotificationsCountQueryHandler implements IQueryHandler<
  GetNotificationsCountQuery,
  NotificationsCountViewType
> {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async execute({
    userId,
  }: GetNotificationsCountQuery): Promise<NotificationsCountViewType> {
    const count = await this.notificationsRepository.countByUserId(userId);

    return NotificationsMapper.toCountView(count);
  }
}
