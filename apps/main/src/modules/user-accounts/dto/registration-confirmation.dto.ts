import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Trim } from '../../../core/decorators/trim.decorator.js';

export class RegistrationConfirmationDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @IsUUID(undefined, { message: 'Code is expired' })
  code: string;
}
