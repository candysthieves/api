import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  ValidateNested,
} from 'class-validator';
import { UploadFileContract } from './upload-file.contract.js';
import { Type } from 'class-transformer';

export class UploadFilesContract {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => UploadFileContract)
  files: UploadFileContract[];
}
