import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePasswordRecoveryCodeDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsString()
  @IsUUID(undefined, { message: 'Recovery code is expired' })
  recoveryCode: string;
}
