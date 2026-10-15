import { ApiProperty } from '@nestjs/swagger';

export class TariffViewType {
  @ApiProperty({ example: 'daily' })
  id!: string;

  @ApiProperty({ example: 'Daily' })
  tariff_name!: string;

  @ApiProperty({ example: 1 })
  durationDays!: number;

  @ApiProperty({
    example: 100,
    description: 'Price in the unit specified by priceUnit.',
  })
  priceInMinorUnits!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'CENT', enum: ['CENT'] })
  priceUnit!: 'CENT';
}
