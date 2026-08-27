import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UploadFileContract {
  @IsNotEmpty()
  @IsString()
  targetId: string;
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
