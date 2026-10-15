export type CreatePaymentParams = {
  paymentId: string;
  amount: string;
  currency: string;
  description: string;
  durationDays: number;
};

export type CreatePaymentResult = {
  externalPaymentId: string;
  paymentUrl: string;
};

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
}
