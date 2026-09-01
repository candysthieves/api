import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreatePostLocationDto {
  @IsString()
  id: string;

  @IsString()
  address: string;
}

export class CreatePostDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostLocationDto)
  location?: CreatePostLocationDto[];
}
