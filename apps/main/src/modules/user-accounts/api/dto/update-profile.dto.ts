import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  username: string;
  @IsOptional()
  @IsString()
  firstName?: string | null;
  @IsOptional()
  @IsString()
  lastName?: string | null;
  @IsOptional()
  dateOfBirth?: string | null;
  @IsOptional()
  @IsString()
  country?: string | null;
  @IsOptional()
  @IsString()
  city?: string | null;
  @IsOptional()
  @IsString()
  @MaxLength(200)
  aboutMe?: string | null;
}
