import { IsUUID } from 'class-validator';

export class DeleteFileContract {
  @IsUUID()
  fileId: string;
}
