import { GetSubscriptionHistoryQueryHandler } from './get-subscription-history.query-handler.js';
import type {
  PaymentsQueryRepository,
  SubscriptionHistoryRow,
} from '../../infrastructure/repositories/payments/payments.query.repository.js';

jest.mock(
  '../../infrastructure/repositories/payments/payments.query.repository.js',
  () => ({
    PaymentsQueryRepository: class {},
  }),
);

describe('GetSubscriptionHistoryQueryHandler pagination', () => {
  const row: SubscriptionHistoryRow = {
    id: 'payment-1',
    createdAtSeconds: Date.parse('2026-10-27T10:00:00.000Z') / 1000,
    paymentDateSeconds: null,
    amount: '100',
    provider: 'YOOKASSA',
    status: 'pending',
    subscriptionName: 'Monthly',
    subscriptionType: 'Business',
    durationDays: 30,
  };
  const findHistory = jest.fn();
  const handler = new GetSubscriptionHistoryQueryHandler({
    findHistory,
  } as unknown as PaymentsQueryRepository);
  const query = { userId: '42', page: 1, pageSize: 2 };

  it('returns zero totalCount when there are no payments', async () => {
    findHistory.mockResolvedValueOnce({ items: [], totalCount: 0 });
    await expect(handler.execute(query)).resolves.toEqual({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 2,
    });
  });

  it('returns the selected page with the total count across all pages', async () => {
    findHistory.mockResolvedValueOnce({
      items: [row, { ...row, id: 'payment-2' }],
      totalCount: 5,
    });
    const result = await handler.execute({ ...query, page: 2 });
    expect(result.items.map((item) => item.id)).toEqual([
      'payment-1',
      'payment-2',
    ]);
    expect(result).toMatchObject({ totalCount: 5, page: 2, pageSize: 2 });
    expect(result.items[0]).toMatchObject({
      price: 100,
      paymentDate: null,
    });
  });

  it('preserves pageSize on a partially filled last page', async () => {
    findHistory.mockResolvedValueOnce({ items: [row], totalCount: 5 });
    const result = await handler.execute({ ...query, page: 3 });
    expect(result.items).toHaveLength(1);
    expect(result).toMatchObject({ totalCount: 5, page: 3, pageSize: 2 });
  });

  it('preserves totalCount for a page beyond the available history', async () => {
    findHistory.mockResolvedValueOnce({ items: [], totalCount: 5 });
    await expect(handler.execute({ ...query, page: 4 })).resolves.toEqual({
      items: [],
      totalCount: 5,
      page: 4,
      pageSize: 2,
    });
  });
});
