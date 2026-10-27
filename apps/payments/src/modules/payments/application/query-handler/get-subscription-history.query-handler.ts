import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { SubscriptionHistoryItemContract } from '@libs/contracts';
import { PaymentsQueryRepository } from '../../infrastructure/repositories/payments/payments.query.repository.js';
import { SubscriptionHistoryMapper } from '../../api/mappers/subscription-history.mapper.js';

export class GetSubscriptionHistoryQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionHistoryItemContract[]
> {
  constructor(
    private readonly paymentsQueryRepository: PaymentsQueryRepository,
  ) {}

  async execute({
    userId,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionHistoryItemContract[]> {
    const payments = await this.paymentsQueryRepository.findHistory(userId);
    return payments.map((payment) => SubscriptionHistoryMapper.toView(payment));
  }
}
