import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Trim } from '../../../../core/decorators/trim.decorator.js';

export class ResendEmailDto {
  @IsNotEmpty()
  @Trim()
  @IsEmail()
  @ApiProperty({
    description: 'Email of already registered but not confirmed user',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;
}
