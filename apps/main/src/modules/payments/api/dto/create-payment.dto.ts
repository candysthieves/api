import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';

export const PAYMENT_PROVIDERS = ['STRIPE', 'YOOKASSA'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Integer ID of the tariff to purchase',
    example: 1,
    type: 'integer',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  tariffId!: number;

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
