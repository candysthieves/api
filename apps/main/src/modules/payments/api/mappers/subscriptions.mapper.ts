import { CurrentSubscriptionResult } from '../../application/payments-tcp.service.js';
import { CurrentSubscriptionViewType } from '../view-types/current-subscription-view.type.js';

export class SubscriptionsMapper {
  static toCurrentView(
    result: CurrentSubscriptionResult,
  ): CurrentSubscriptionViewType {
    return {
      expirationDate: new Date(result.expirationDate).toISOString(),
      nextChargeDate: result.nextChargeDate
        ? new Date(result.nextChargeDate).toISOString()
        : null,
    };
  }
}
