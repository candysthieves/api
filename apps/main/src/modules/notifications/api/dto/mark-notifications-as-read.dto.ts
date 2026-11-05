import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class MarkNotificationsAsReadDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Array of notification IDs to mark as read',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids!: string[];
}
