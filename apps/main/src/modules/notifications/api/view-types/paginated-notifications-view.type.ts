import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationItemContract,
  NotificationType,
  PaginatedNotificationsContract,
} from '@libs/contracts';

export class NotificationItemViewType implements NotificationItemContract {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique notification ID',
  })
  id!: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.PAYMENT,
    description: 'Notification category/type',
  })
  type!: NotificationType;

  @ApiProperty({
    example: 'Subscription activated',
    description: 'Notification title',
  })
  title!: string;

  @ApiProperty({
    example: 'Your monthly subscription has been successfully activated.',
    description: 'Notification body message',
  })
  message!: string;

  @ApiProperty({
    example: false,
    description: 'Read status flag',
  })
  isRead!: boolean;

  @ApiProperty({
    example: null,
    nullable: true,
    format: 'date-time',
    description: 'Date and time when the notification was marked as read',
  })
  readAt!: string | null;

  @ApiProperty({
    example: '2026-11-04T12:00:00.000Z',
    format: 'date-time',
    description: 'Creation timestamp',
  })
  createdAt!: string;
}

export class PaginatedNotificationsViewType implements PaginatedNotificationsContract {
  @ApiProperty({
    type: [NotificationItemViewType],
    description: 'List of notifications for the current page',
  })
  items!: NotificationItemViewType[];

  @ApiProperty({
    example: '2026-11-04T11:45:00.000Z',
    nullable: true,
    format: 'date-time',
    description:
      'Cursor for the next page (createdAt timestamp of the last element). Null if there are no more pages.',
  })
  nextCursor!: string | null;

  @ApiProperty({
    example: true,
    description: 'Indicates if there is another page of notifications',
  })
  hasMore!: boolean;
}
