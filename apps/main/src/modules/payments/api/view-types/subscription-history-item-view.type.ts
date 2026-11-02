import { ApiProperty } from '@nestjs/swagger';
import type {
  PaymentHistoryStatus,
  SubscriptionHistoryItemContract,
} from '@libs/contracts';

export class SubscriptionHistoryItemViewType implements SubscriptionHistoryItemContract {
  @ApiProperty({ example: 'payment-123' })
  id!: string;

  @ApiProperty({
    example: '2026-09-15T12:00:00.000Z',
    format: 'date-time',
    description: 'Payment attempt creation date.',
  })
  date!: string;

  @ApiProperty({
    example: '2026-09-15T12:00:00.000Z',
    format: 'date-time',
    type: String,
    nullable: true,
    description: 'Payment date, or null if the attempt has not been paid.',
  })
  paymentDate!: string | null;

  @ApiProperty({
    example: '2026-10-15T12:00:00.000Z',
    format: 'date-time',
    type: String,
    nullable: true,
    description:
      'Payment date plus the current tariff duration; null without a payment date.',
  })
  subscriptionEndDate!: string | null;

  @ApiProperty({ example: 999, description: 'Payment amount in minor units.' })
  price!: number;

  @ApiProperty({ example: 'USD', enum: ['USD'] })
  currency!: 'USD';

  @ApiProperty({ example: 'Monthly' })
  subscriptionName!: string;

  @ApiProperty({ example: 'Personal' })
  subscriptionType!: string;

  @ApiProperty({ example: 'YOOKASSA', enum: ['STRIPE', 'YOOKASSA'] })
  paymentService!: 'STRIPE' | 'YOOKASSA';

  @ApiProperty({
    example: 'succeeded',
    enum: ['pending', 'succeeded', 'canceled', 'failed'],
  })
  status!: PaymentHistoryStatus;
}
