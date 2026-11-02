import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export const PAYMENT_PROVIDERS = ['STRIPE', 'YOOKASSA'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Positive integer tariff ID; numeric strings are also accepted.',
    example: 1,
    oneOf: [
      { type: 'integer', minimum: 1 },
      { type: 'string', example: '1' },
    ],
  })
  @Type(() => Number)
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
