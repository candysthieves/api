import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePasswordRecoveryCodeDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  recoveryCode: string;
}
