import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Trim } from '../../../core/decorators/trim.decorator.js';
import { ApiProperty } from '@nestjs/swagger';

export class RegistrationConfirmationDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @IsUUID(undefined, { message: 'Confirmation code is not UUID format' })
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'Confirmation code sent by email in the confirmation link.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  code: string;
}
