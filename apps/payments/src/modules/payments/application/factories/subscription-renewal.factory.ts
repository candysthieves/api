export class SubscriptionRenewalFactory {
  static nextChargeAt(successfulPaymentAt: Date, durationDays: number): Date {
    return new Date(successfulPaymentAt.getTime() + durationDays * 86_400_000);
  }

  static retryAt(firstFailureAt: Date): Date {
    return new Date(firstFailureAt.getTime() + 24 * 60 * 60 * 1000);
  }
}
