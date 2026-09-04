import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UploadFileContract } from './upload-file.contract.js';
import { Type } from 'class-transformer';

export class UploadFilesContract {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  traceId?: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => UploadFileContract)
  files: UploadFileContract[];
}
