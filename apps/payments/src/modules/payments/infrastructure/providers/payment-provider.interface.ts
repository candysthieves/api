export type CreatePaymentParams = {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  durationDays: number;
};

export type CreatePaymentResult = {
  externalPaymentId: string;
  paymentUrl: string;
};

export type ProviderPaymentStatus = 'pending' | 'succeeded' | 'canceled';

export type ProviderPaymentInfo = {
  id: string;
  status: ProviderPaymentStatus;
  paymentMethodId: string | null;
};

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  getPayment(externalPaymentId: string): Promise<ProviderPaymentInfo>;
}
