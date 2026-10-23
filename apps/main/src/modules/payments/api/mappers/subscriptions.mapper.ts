import type { CurrentSubscriptionResult } from '../../application/types/current-subscription-result.type.js';
import { CurrentSubscriptionViewType } from '../view-types/current-subscription-view.type.js';

export class SubscriptionsMapper {
  static toCurrentView(
    result: CurrentSubscriptionResult,
  ): CurrentSubscriptionViewType {
    return {
      expirationDate: result.expirationDate
        ? new Date(result.expirationDate).toISOString()
        : null,
      nextChargeDate: result.nextChargeDate
        ? new Date(result.nextChargeDate).toISOString()
        : null,
    };
  }
}
