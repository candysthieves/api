import { PaymentViewType } from '../view-types/payment-view.type.js';

export class PaymentsMapper {
  static toView(paymentId: string, paymentUrl: string): PaymentViewType {
    return {
      paymentId,
      paymentUrl,
    };
  }
}
