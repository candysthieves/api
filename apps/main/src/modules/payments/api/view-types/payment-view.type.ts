import { ApiProperty } from '@nestjs/swagger';

export class PaymentViewType {
  @ApiProperty({
    description: 'Internal payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  paymentId!: string;

  @ApiProperty({
    description:
      'YooKassa payment ID. For local webhook testing, copy this value to object.id; null for other providers.',
    example: '3265d4d2-000f-5001-8000-12c0b7d66709',
    nullable: true,
  })
  yookassaPaymentId!: string | null;

  @ApiProperty({
    description: 'URL to redirect the user to complete payment',
    example: 'https://checkout.stripe.com/pay/...',
  })
  paymentUrl!: string;
}
