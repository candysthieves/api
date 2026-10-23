import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionHistoryMapper } from '../../api/mappers/subscription-history.mapper.js';
import type { SubscriptionPaymentHistoryItem } from '../types/subscription-payment-history-item.type.js';

export class GetSubscriptionHistoryQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionPaymentHistoryItem[]
> {
  constructor(private readonly payments: PaymentsRepository) {}

  async execute({
    userId,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionPaymentHistoryItem[]> {
    const payments = await this.payments.findHistoryByUserId(userId);
    return SubscriptionHistoryMapper.toViews(payments);
  }
}
