import { ApiProperty } from '@nestjs/swagger';

export class PaymentViewType {
  @ApiProperty({
    description: 'Internal payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  paymentId!: string;

  @ApiProperty({
    description: 'URL to redirect the user to complete payment',
    example: 'https://checkout.stripe.com/pay/...',
  })
  paymentUrl!: string;
}
