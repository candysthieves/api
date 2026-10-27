import { ApiProperty } from '@nestjs/swagger';
import type { SubscriptionHistoryContract } from '@libs/contracts';
import { SubscriptionHistoryItemViewType } from './subscription-history-item-view.type.js';

export class SubscriptionHistoryViewType implements SubscriptionHistoryContract {
  @ApiProperty({ type: [SubscriptionHistoryItemViewType] })
  items!: SubscriptionHistoryItemViewType[];

  @ApiProperty({
    example: 42,
    description: 'Total number of payment attempts for the authenticated user.',
  })
  totalCount!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  page!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 20 })
  pageSize!: number;
}
