import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export const PAYMENT_PROVIDERS = ['STRIPE', 'YOOKASSA'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class CreatePaymentDto {
  @ApiProperty({
    description: 'UUID of the tariff to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  tariffId!: string;

  @ApiProperty({
    description: 'Payment provider',
    enum: PAYMENT_PROVIDERS,
    example: 'STRIPE',
  })
  @IsEnum(PAYMENT_PROVIDERS, {
    message: 'provider must be either STRIPE or YOOKASSA',
  })
  provider!: PaymentProvider;
}
