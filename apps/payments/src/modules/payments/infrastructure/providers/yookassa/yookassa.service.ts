import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  IPaymentProvider,
} from '../payment-provider.interface.js';
import { PaymentsConfig } from '../../../../../payments.config.js';
import { ObjectResult } from '../../../../../core/object-result.js';

export type YookassaPayment = {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  confirmation?: { confirmation_url: string };
  payment_method?: { id: string; saved: boolean };
};

@Injectable()
export class YookassaService implements IPaymentProvider {
  constructor(private readonly paymentsConfig: PaymentsConfig) {}

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    try {
      const payment = await this.request('', {
        method: 'POST',
        headers: { 'Idempotence-Key': params.paymentId },
        body: JSON.stringify({
          amount: {
            value: (params.amount / 100).toFixed(2),
            currency: params.currency,
          },
          capture: true,
          save_payment_method: true,
          description: params.description,
          confirmation: {
            type: 'redirect',
            return_url: `${this.paymentsConfig.frontendUrl.replace(/\/+$/, '')}/payment/success?paymentId=${params.paymentId}`,
          },
        }),
      });
      if (!payment.confirmation?.confirmation_url) {
        throw new Error('YooKassa did not return a confirmation URL');
      }
      return {
        externalPaymentId: payment.id,
        paymentUrl: payment.confirmation.confirmation_url,
      };
    } catch {
      throw new RpcException(
        ObjectResult.failure({
          code: 'PAYMENT_CREATION_FAILED',
          errors: [
            { field: 'payment', message: 'YooKassa payment creation failed' },
          ],
        }),
      );
    }
  }

  async getPayment(externalPaymentId: string): Promise<YookassaPayment> {
    return this.request(`/${encodeURIComponent(externalPaymentId)}`);
  }

  createAutoRenewalPayment(
    params: CreatePaymentParams,
    paymentMethodId: string,
  ): Promise<YookassaPayment> {
    return this.request('', {
      method: 'POST',
      headers: { 'Idempotence-Key': params.paymentId },
      body: JSON.stringify({
        amount: {
          value: (params.amount / 100).toFixed(2),
          currency: params.currency,
        },
        capture: true,
        payment_method_id: paymentMethodId,
        description: params.description,
      }),
    });
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<YookassaPayment> {
    const response = await fetch(`https://api.yookassa.ru/v3/payments${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.paymentsConfig.yookassaShopId}:${this.paymentsConfig.yookassaSecretKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`YOOKASSA_HTTP_${response.status}`);
    }
    return (await response.json()) as YookassaPayment;
  }
}
