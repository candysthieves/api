import { PaymentViewType } from '../view-types/payment-view.type.js';

export class PaymentsMapper {
  static toView(
    paymentId: string,
    yookassaPaymentId: string | null,
    paymentUrl: string,
  ): PaymentViewType {
    return {
      paymentId,
      yookassaPaymentId,
      paymentUrl,
    };
  }
}
