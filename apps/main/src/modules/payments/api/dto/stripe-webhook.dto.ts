import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StripeWebhookDto {
  @ApiProperty({ example: 'evt_123456789' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'checkout.session.completed' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Stripe event data payload',
    example: { object: { id: 'cs_test_123' } },
  })
  @IsDefined()
  @IsObject()
  data: Record<string, any>;
}
