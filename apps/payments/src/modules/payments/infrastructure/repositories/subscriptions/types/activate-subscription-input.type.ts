export type ActivateSubscriptionInput = {
  userId: string;
  tariffId: string;
  paymentId: string;
  paymentMethodId: string;
  expirationDate: Date;
  nextChargeDate: Date | null;
};
