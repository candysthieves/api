import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { SubscriptionHistoryContract } from '@libs/contracts';
import { PaymentsQueryRepository } from '../../infrastructure/repositories/payments/payments.query.repository.js';
import { SubscriptionHistoryMapper } from '../../api/mappers/subscription-history.mapper.js';

export class GetSubscriptionHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}

@QueryHandler(GetSubscriptionHistoryQuery)
export class GetSubscriptionHistoryQueryHandler implements IQueryHandler<
  GetSubscriptionHistoryQuery,
  SubscriptionHistoryContract
> {
  constructor(
    private readonly paymentsQueryRepository: PaymentsQueryRepository,
  ) {}

  async execute({
    userId,
    page,
    pageSize,
  }: GetSubscriptionHistoryQuery): Promise<SubscriptionHistoryContract> {
    const { items: payments, totalCount } =
      await this.paymentsQueryRepository.findHistory(userId, page, pageSize);
    const items = payments.map((payment) =>
      SubscriptionHistoryMapper.toView(payment),
    );
    return {
      items,
      totalCount,
      page,
      pageSize,
    };
  }
}
