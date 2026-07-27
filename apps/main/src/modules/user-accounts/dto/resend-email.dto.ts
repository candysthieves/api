import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class ResendEmailDto {
  @ApiProperty({
    description: 'Unique email address.',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @Trim()
  @IsEmail()
  email: string;
}
