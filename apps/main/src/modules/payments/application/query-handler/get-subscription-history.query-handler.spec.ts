import { GetSubscriptionHistoryQueryHandler } from './get-subscription-history.query-handler.js';
import {
  DomainExceptionCode,
  ErrorStatus,
} from '../../../../core/exceptions/domain-exception-code.js';

describe('GetSubscriptionHistoryQueryHandler', () => {
  const getSubscriptionHistory = jest.fn();
  const handler = new GetSubscriptionHistoryQueryHandler({
    getSubscriptionHistory,
  } as unknown as ConstructorParameters<
    typeof GetSubscriptionHistoryQueryHandler
  >[0]);

  it('returns an empty history when the user has no payment attempts', async () => {
    getSubscriptionHistory.mockResolvedValueOnce({ data: [], error: null });
    await expect(handler.execute({ userId: '42' })).resolves.toEqual([]);
  });

  it.each([
    { data: null, error: { code: 'DATABASE_UNAVAILABLE' } },
    { data: null, error: null },
  ])(
    'reports unavailable history instead of a successful empty response: %j',
    async (response) => {
      getSubscriptionHistory.mockResolvedValueOnce(response);
      await expect(handler.execute({ userId: '42' })).rejects.toMatchObject({
        code: DomainExceptionCode.ServiceUnavailable,
        errorCode: ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
      });
    },
  );

  it('converts dependency failures into the domain error format', async () => {
    getSubscriptionHistory.mockRejectedValueOnce(new Error('timeout'));
    await expect(handler.execute({ userId: '42' })).rejects.toMatchObject({
      code: DomainExceptionCode.ServiceUnavailable,
      errorCode: ErrorStatus.SUBSCRIPTION_RETRIEVAL_FAILED,
    });
  });
});
