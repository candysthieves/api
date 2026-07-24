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
  @ApiProperty({
    description: 'Unique username.',
    example: 'john_doe',
    minLength: 6,
    maxLength: 30,
    pattern: '^[A-Za-z0-9_-]+$',
  })
  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 30)
  @Matches(/^[A-Za-z0-9_-]+$/)
  username: string;

  @ApiProperty({
    description: 'Unique email address.',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @Trim()
  @IsEmail()
  email: string;

  @ApiProperty({
    description:
      'Password containing lowercase and uppercase letters, a digit, and supported special characters.',
    example: 'SecurePass1!',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!"#$%&'()*+,\-./:;<=>?@[\]^_{|}~]+$/,
    {
      message:
        'Password must contain 0-9, a-z, A-Z, ! " # $ % & \' ( ) * + , - . / : ; < = > ? @ [ \\ ] ^ _ { | } ~ ',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Confirmation matching the password.',
    example: 'SecurePass1!',
    minLength: 6,
    maxLength: 20,
    format: 'password',
  })
  @IsNotEmpty()
  @Trim()
  @IsString()
  passwordConfirmation: string;

  @ApiProperty({
    description: 'Must be accepted to register.',
    example: true,
    enum: [true],
  })
  @IsNotEmpty()
  @IsBoolean()
  @Equals(true)
  isTermsAccepted: boolean;
}
