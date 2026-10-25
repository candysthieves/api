import { Type } from 'class-transformer';
import {
  Equals,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class YookassaWebhookObjectDto {
  @ApiProperty({ description: 'YooKassa payment ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class YookassaWebhookDto {
  @ApiProperty({ example: 'notification' })
  @Equals('notification')
  type: string;

  @ApiProperty({ example: 'payment.succeeded' })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({ type: YookassaWebhookObjectDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => YookassaWebhookObjectDto)
  object: YookassaWebhookObjectDto;
}
