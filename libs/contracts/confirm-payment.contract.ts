import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmPaymentContract {
  @IsString()
  @IsIn(['STRIPE', 'YOOKASSA'])
  provider: 'STRIPE' | 'YOOKASSA';

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  externalPaymentId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['succeeded', 'failed'])
  status: 'succeeded' | 'failed';
}
