import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class StripeWebhookObjectDto {
  @ApiProperty({ description: 'Stripe object ID (e.g. checkout session ID)' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

class StripeWebhookDataDto {
  @ApiProperty({ type: StripeWebhookObjectDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => StripeWebhookObjectDto)
  object: StripeWebhookObjectDto;
}

export class StripeWebhookDto {
  @ApiProperty({ example: 'evt_123456789' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'checkout.session.completed' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ type: StripeWebhookDataDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => StripeWebhookDataDto)
  data: StripeWebhookDataDto;
}
