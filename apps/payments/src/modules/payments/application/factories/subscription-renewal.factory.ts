// Рассчитывает длительность подписки и дату следующего списания.
export class SubscriptionRenewalFactory {
  // Использует тестовую длительность в минутах, если она задана; иначе — длительность тарифа.
  static durationDays(durationDays: number, durationMinutes?: number): number {
    return durationMinutes === undefined
      ? durationDays
      : durationMinutes / 1440;
  }

  static nextChargeAt(
    successfulPaymentAt: Date,
    durationDays: number,
    durationMinutes?: number,
  ): Date {
    // Прибавляет точную длительность к моменту оплаты; календарные месяцы не учитываются.
    return new Date(
      successfulPaymentAt.getTime() +
        this.durationDays(durationDays, durationMinutes) * 86_400_000,
    );
  }
}
