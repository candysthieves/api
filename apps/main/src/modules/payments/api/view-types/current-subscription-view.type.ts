import { ApiProperty } from '@nestjs/swagger';

export class CurrentSubscriptionViewType {
  @ApiProperty({
    example: '2026-10-15T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  expirationDate!: string | null;

  @ApiProperty({
    example: '2026-10-15T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  nextChangeDate!: string | null;
}
