import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';

export class MarkNotificationsAsReadContract {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
