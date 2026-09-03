import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

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
  @Transform(({ value }) =>
    Buffer.isBuffer(value)
      ? value
      : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        Buffer.from(value?.data ?? value),
  )
  buffer: Buffer;
}
