import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  @IsString()
  originalName: string;
  @IsNotEmpty()
  @IsString()
  mimeType: string;
  @IsNotEmpty()
  @IsNumber()
  size: number;
  @IsNotEmpty()
  buffer: Buffer;
}
