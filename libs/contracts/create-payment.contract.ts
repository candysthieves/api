import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export const PAYMENT_PROVIDERS = ['STRIPE', 'YOOKASSA'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class CreatePaymentContract {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  tariffId: string;

  @IsEnum(PAYMENT_PROVIDERS, {
    message: 'provider must be either STRIPE or YOOKASSA',
  })
  provider: PaymentProvider;
}
