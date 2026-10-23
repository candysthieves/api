import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionHistoryItemViewType {
  @ApiProperty({ example: 'payment-123' })
  id!: string;

  @ApiProperty({
    example: '2026-09-15T12:00:00.000Z',
    format: 'date-time',
  })
  date!: string;

  @ApiProperty({
    example: '2026-09-15T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  paymentDate!: string | null;

  @ApiProperty({
    example: '2026-10-15T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  subscriptionEndDate!: string | null;

  @ApiProperty({ example: 999, description: 'Payment amount.' })
  price!: number;

  @ApiProperty({ example: 'Monthly' })
  subscriptionName!: string;

  @ApiProperty({ example: 'Personal' })
  subscriptionType!: string;

  @ApiProperty({ example: 'YOOKASSA', enum: ['STRIPE', 'YOOKASSA'] })
  paymentService!: 'STRIPE' | 'YOOKASSA';

  @ApiProperty({
    example: 'succeeded',
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
  })
  status!: 'pending' | 'succeeded' | 'failed' | 'refunded';
}
