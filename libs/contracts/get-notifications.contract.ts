import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetNotificationsContract {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  cursor?: string | null;
}
