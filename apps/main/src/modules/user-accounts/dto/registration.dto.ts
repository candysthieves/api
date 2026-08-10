import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class RegistrationDto {
  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 30)
  @Matches(/^[A-Za-z0-9_-]+$/)
  @ApiProperty({
    description: 'Unique username.',
    example: 'john_doe',
    minLength: 6,
    maxLength: 30,
    pattern: '^[A-Za-z0-9_-]+$',
  })
  username: string;

  @IsNotEmpty()
  @Trim()
  @IsEmail()
  @ApiProperty({
    description: 'Unique email address.',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[A-Za-z0-9!"#$%&'()*+,\-./:;<=>?@[\]\\^_{|}~]+$/,
    {
      message:
        'Password must contain 0-9, a-z, A-Z, ! " # $ % & \' ( ) * + , - . / : ; < = > ? @ [ \\ ] ^ _ { | } ~ ',
    },
  )
  @ApiProperty({
    description:
      'Password must contain `0-9`, `a-z`, `A-Z` and supported special characters.',
    example: 'SecurePass1!',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  password: string;

  @IsNotEmpty()
  @Trim()
  @IsString()
  @ApiProperty({
    description: 'Confirmation matching the password.',
    example: 'SecurePass1!',
    format: 'password',
  })
  passwordConfirmation: string;

  @IsNotEmpty()
  @IsBoolean()
  @Equals(true)
  @ApiProperty({
    description: 'Must be accepted to register.',
    example: true,
  })
  isTermsAccepted: boolean;
}
