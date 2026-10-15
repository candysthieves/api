import { ApiProperty } from '@nestjs/swagger';
import { SUBSCRIPTION_TYPES } from '@libs/contracts';

export class SubscriptionTypeViewType {
  @ApiProperty({
    enum: Object.values(SUBSCRIPTION_TYPES),
    example: 'Personal',
  })
  type!: (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];
}
