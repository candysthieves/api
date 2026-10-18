import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class YookassaPaymentObjectDto {
  @ApiProperty({ example: '3265cb2a-000f-5001-8000-1f76854a0edb' })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class YookassaWebhookDto {
  @ApiProperty({ type: YookassaPaymentObjectDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => YookassaPaymentObjectDto)
  object!: YookassaPaymentObjectDto;
}
