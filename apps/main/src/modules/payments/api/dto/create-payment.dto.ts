import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { PAYMENT_PROVIDERS, type PaymentProvider } from '@libs/contracts';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'UUID of the tariff to purchase',
    example: 'f7ab9fb0-5551-4651-b101-00f4910fe68e',
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
