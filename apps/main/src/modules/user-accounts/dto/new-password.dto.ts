import { IsNotEmpty, IsString, IsUUID, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class NewPasswordDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsString()
  @IsUUID(undefined, { message: 'Code is expired' })
  recoveryCode: string;

  @ApiProperty({ minLength: 6, maxLength: 20, format: 'password' })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!"#$%&'()*+,\-./:;<=>?@[\]^_{|}~]+$/,
  )
  newPassword: string;

  @ApiProperty({ minLength: 6, maxLength: 20, format: 'password' })
  @Trim()
  @IsNotEmpty()
  @IsString()
  newPasswordConfirmation: string;
}
