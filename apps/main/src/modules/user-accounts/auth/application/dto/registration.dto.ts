import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Trim } from '../../../../../core/decorators/trim.decorator.js';

export class RegistrationDto {
  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 30)
  @Matches(/^[A-Za-z0-9_-]+$/)
  username: string;
  @IsNotEmpty()
  @Trim()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @Trim()
  @IsString()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d!"#$%&'()*+,\-./:;<=>?@[\]^_{|}~]+$/,
  )
  password: string;
  @IsNotEmpty()
  @Trim()
  @IsString()
  passwordConfirmation: string;
  @IsNotEmpty()
  @IsBoolean()
  @Equals(true)
  isTermsAccepted: boolean;
}
