import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Unique username',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'Date of birth in ISO format (YYYY-MM-DD)',
    example: '1995-05-15',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({
    description: 'Country of residence',
    example: 'United States',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiPropertyOptional({
    description: 'City of residence',
    example: 'New York',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional({
    description: 'About me bio',
    example: 'Software developer and open source enthusiast.',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  aboutMe?: string | null;
}
