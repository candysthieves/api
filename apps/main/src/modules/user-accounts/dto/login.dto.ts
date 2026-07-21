import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Registered email address.',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail(
    {},
    {
      message: 'The email must match the format example@example.com',
    },
  )
  email: string;

  @ApiProperty({
    description: 'Account password.',
    example: 'SecurePass1!',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  @IsString()
  @Length(6, 20)
  password: string;
}
