import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { GetSubscriptionHistoryQueryParamsDto } from './get-subscription-history-query-params.dto.js';

describe('GetSubscriptionHistoryQueryParamsDto', () => {
  it('defaults to the first page of ten payments', () => {
    const dto = plainToInstance(GetSubscriptionHistoryQueryParamsDto, {});
    expect(dto.pageSize).toBe(10);
    expect(dto.page).toBe(1);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it.each(['1', '10', '20'])(
    'accepts pageSize %s from query parameters',
    (pageSize) => {
      const dto = plainToInstance(GetSubscriptionHistoryQueryParamsDto, {
        pageSize,
        page: '2',
      });
      expect(dto.pageSize).toBe(Number(pageSize));
      expect(validateSync(dto)).toHaveLength(0);
    },
  );

  it.each(['0', '-1', '21', '1.5', 'abc', ''])(
    'rejects pageSize %p',
    (pageSize) => {
      const dto = plainToInstance(GetSubscriptionHistoryQueryParamsDto, {
        pageSize,
      });
      expect(
        validateSync(dto).some((error) => error.property === 'pageSize'),
      ).toBe(true);
    },
  );

  it.each(['0', '-1', '1.5', 'invalid', '', '9007199254740992'])(
    'rejects page %p',
    (page) => {
      const dto = plainToInstance(GetSubscriptionHistoryQueryParamsDto, {
        page,
      });
      expect(validateSync(dto).some((error) => error.property === 'page')).toBe(
        true,
      );
    },
  );
});
