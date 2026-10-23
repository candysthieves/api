import { ApiProperty } from '@nestjs/swagger';

export class CurrentSubscriptionViewType {
  @ApiProperty({ example: '2026-11-16T12:00:00.000Z', nullable: true })
  expirationDate!: string | null;

  @ApiProperty({ example: '2026-11-16T12:00:00.000Z', nullable: true })
  nextChargeDate!: string | null;
}
