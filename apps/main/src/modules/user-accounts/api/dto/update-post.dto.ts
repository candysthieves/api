import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @ApiProperty({
    description: 'New description for post',
    example: 'No way!',
  })
  description: string;
}
