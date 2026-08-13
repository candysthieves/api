import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @IsEmail(
    {},
    {
      message: 'The email must match the format example@example.com',
    },
  )
  @ApiProperty({
    description: 'Registered email address.',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @IsString()
  @Length(6, 20)
  @ApiProperty({
    description:
      'Password must contain `0-9`, `a-z`, `A-Z` and supported special characters.',
    example: 'SecurePass1!',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  password: string;
}
