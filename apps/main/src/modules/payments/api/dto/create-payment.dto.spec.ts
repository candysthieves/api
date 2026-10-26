import { validateSync } from 'class-validator';
import { CreatePaymentDto } from './create-payment.dto.js';
import { CreatePaymentContract } from '../../../../../../../libs/contracts/create-payment.contract.js';

describe('Numeric tariff ID validation', () => {
  it.each([CreatePaymentDto, CreatePaymentContract])(
    'accepts a positive integer in %p',
    (Dto) => {
      const dto = Object.assign(new Dto(), {
        userId: '42',
        tariffId: 1,
        provider: 'YOOKASSA',
      });
      expect(validateSync(dto)).toHaveLength(0);
    },
  );

  it.each([0, -1, 1.5, '1', '123e4567-e89b-12d3-a456-426614174000'])(
    'rejects invalid tariff ID %p on both boundaries',
    (tariffId) => {
      for (const Dto of [CreatePaymentDto, CreatePaymentContract]) {
        const dto = Object.assign(new Dto(), {
          userId: '42',
          tariffId,
          provider: 'YOOKASSA',
        });
        expect(
          validateSync(dto).some((error) => error.property === 'tariffId'),
        ).toBe(true);
      }
    },
  );
});
