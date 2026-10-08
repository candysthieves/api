import { Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostLocationDto {
  @IsString()
  @ApiProperty({
    description: 'Id location',
  })
  id: string;

  @IsString()
  @ApiProperty({
    description: 'Location address',
  })
  address: string;
}

export class CreatePostDto {
  @IsString()
  @ApiProperty({
    description: 'Description for post',
    example: 'Mom was washing the frame',
  })
  description: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostLocationDto)
  @ApiPropertyOptional({
    description: 'Location for images',
    type: () => CreatePostLocationDto,
    isArray: true,
  })
  location?: CreatePostLocationDto[];
}
