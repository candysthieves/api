import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class PasswordRecoveryDto {
  @ApiProperty({ example: 'john.doe@example.com', format: 'email' })
  @Trim()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'reCAPTCHA v3 token created with the password_recovery action immediately before this request.',
  })
  @Trim()
  @IsNotEmpty()
  recaptchaToken: string;
}
