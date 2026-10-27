import { ApiProperty } from '@nestjs/swagger';

export class TariffViewType {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Daily' })
  tariff_name!: string;

  @ApiProperty({ example: 1 })
  durationDays!: number;

  @ApiProperty({
    example: 100,
    description: 'Price in the unit specified by priceUnit.',
  })
  price!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'CENT', enum: ['CENT'] })
  priceUnit!: 'CENT';
}
