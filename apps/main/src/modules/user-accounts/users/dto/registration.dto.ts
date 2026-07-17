import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Trim } from '../../../../core/decorators/trim.decorator.js';

export class RegistrationDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)
  email: string;
}
