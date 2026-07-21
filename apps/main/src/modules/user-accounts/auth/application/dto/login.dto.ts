import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail(
    {},
    {
      message: 'The email must match the format example@example.com',
    },
  )
  email: string;
  @IsString()
  @Length(6, 20)
  password: string;
}
