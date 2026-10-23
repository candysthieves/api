import { PaymentViewType } from '../view-types/payment-view.type.js';
import type { PaymentResult } from '../../application/types/payment-result.type.js';

export class PaymentsMapper {
  static toView(result: PaymentResult): PaymentViewType {
    return {
      paymentId: result.paymentId,
      paymentUrl: result.paymentUrl,
    };
  }
}
