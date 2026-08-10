import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class PasswordRecoveryDto {
  @Trim()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'john.doe@example.com', format: 'email' })
  email: string;

  @Trim()
  @IsNotEmpty()
  @ApiProperty({
    type: 'string',
    description:
      'One-time token returned after completing the reCAPTCHA v2 Checkbox challenge immediately before this request.',
    example: 'recaptcha-token-placeholder',
  })
  recaptchaToken: string;
}
