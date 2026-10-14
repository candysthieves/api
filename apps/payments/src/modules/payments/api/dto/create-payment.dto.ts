import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import type { PaymentProvider } from '../../../../database/types/payment-database.type.js';

export const PAYMENT_PROVIDERS = ['STRIPE', 'YOOKASSA'] as const;

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  tariffId!: string;

  @IsEnum(PAYMENT_PROVIDERS, {
    message: 'provider must be either STRIPE or YOOKASSA',
  })
  provider!: PaymentProvider;
}


