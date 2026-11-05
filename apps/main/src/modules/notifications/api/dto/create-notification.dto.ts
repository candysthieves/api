import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'Payment Successful',
    description: 'Notification title',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Your payment has been successfully processed.',
    description: 'Notification body message',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    example: 'PAYMENT',
    description: 'Optional notification type',
  })
  @IsOptional()
  @IsString()
  type?: string;
}
