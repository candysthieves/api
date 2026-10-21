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
  })
  paymentDate!: string;

  @ApiProperty({
    example: '2026-10-15T12:00:00.000Z',
    format: 'date-time',
  })
  subscriptionEndDate!: string;

  @ApiProperty({ example: 999, description: 'Payment amount.' })
  price!: number;

  @ApiProperty({ example: 'Monthly' })
  subscriptionName!: string;

  @ApiProperty({ example: 'Personal' })
  subscriptionType!: string;

  @ApiProperty({ example: 'YOOKASSA', enum: ['STRIPE', 'YOOKASSA'] })
  paymentService!: 'STRIPE' | 'YOOKASSA';
}
