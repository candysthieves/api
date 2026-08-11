import { IsNotEmpty, IsString, IsUUID, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class NewPasswordDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID(undefined, { message: 'Recovery code  must be UUID' })
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Password recovery code sent by email.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  recoveryCode: string;

  @Trim()
  @IsNotEmpty()
  @IsString()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!"#$%&'()*+,\-./:;<=>?@[\]^_{|}~]+$/,
  )
  @ApiProperty({
    description:
      'Password must contain `0-9`, `a-z`, `A-Z` and supported special characters.',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  newPassword: string;

  @Trim()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Confirmation matching the password.',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  newPasswordConfirmation: string;
}
