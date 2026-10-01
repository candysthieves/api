import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CleanupUnusedPostFilesContract {
  @IsArray()
  @IsString({ each: true })
  activeFileIds: string[];

  @IsOptional()
  @IsInt()
  olderThanHours?: number;
}
