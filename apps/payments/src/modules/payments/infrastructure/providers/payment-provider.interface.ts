export type CreatePaymentParams = {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  durationDays: number;
};

export type YookassaPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
  payment_method?: { id?: string; saved?: boolean };
  captured_at?: string;
  created_at?: string;
};

export type CreateRecurringPaymentParams = {
  paymentMethodId: string;
  amount: number;
  currency: string;
  description: string;
  idempotencyKey: string;
};

export type CreatePaymentResult = {
  externalPaymentId: string;
  paymentUrl: string;
};

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
}
