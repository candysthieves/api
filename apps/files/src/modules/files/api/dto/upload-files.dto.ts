import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { UploadFileDto } from './upload-file.dto.js';
import { Type } from 'class-transformer';

export class UploadFilesDto {
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => UploadFileDto)
  files: UploadFileDto[];
}
