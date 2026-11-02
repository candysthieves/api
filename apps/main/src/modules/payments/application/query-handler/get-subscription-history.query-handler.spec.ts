import { GetSubscriptionHistoryQueryHandler } from './get-subscription-history.query-handler.js';
import {
  DomainExceptionCode,
  ErrorStatus,
} from '../../../../core/exceptions/domain-exception-code.js';

describe('GetSubscriptionHistoryQueryHandler', () => {
  const query = { userId: '42', page: 1, pageSize: 10 };
  const getSubscriptionHistory = jest.fn();
  const handler = new GetSubscriptionHistoryQueryHandler({
    getSubscriptionHistory,
  } as unknown as ConstructorParameters<
    typeof GetSubscriptionHistoryQueryHandler
  >[0]);

  it('returns an empty history when the user has no payment attempts', async () => {
    const data = { items: [], totalCount: 0, page: 1, pageSize: 10 };
    getSubscriptionHistory.mockResolvedValueOnce({ data, error: null });
    await expect(handler.execute(query)).resolves.toEqual(data);
  });

  it.each([
    { data: null, error: { code: 'DATABASE_UNAVAILABLE' } },
    { data: null, error: null },
  ])(
    'reports unavailable history instead of a successful empty response: %j',
    async (response) => {
      getSubscriptionHistory.mockResolvedValueOnce(response);
      await expect(handler.execute(query)).rejects.toMatchObject({
        code: DomainExceptionCode.ServiceUnavailable,
        errorCode: ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
      });
    },
  );

  it('converts dependency failures into the domain error format', async () => {
    getSubscriptionHistory.mockRejectedValueOnce(new Error('timeout'));
    await expect(handler.execute(query)).rejects.toMatchObject({
      code: DomainExceptionCode.ServiceUnavailable,
      errorCode: ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
    });
  });
});
