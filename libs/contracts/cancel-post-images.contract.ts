import { IsUUID } from 'class-validator';

export class CancelPostImagesContract {
  @IsUUID('4')
  postId: string;
}
