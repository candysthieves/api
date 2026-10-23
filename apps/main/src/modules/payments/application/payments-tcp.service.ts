import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { CreatePaymentContract } from '@libs/contracts';
import type {
  SubscriptionTypeContract,
  SubscriptionTypeName,
} from '@libs/contracts';
import type { CurrentSubscriptionResult } from './types/current-subscription-result.type.js';
import type { PaymentResult } from './types/payment-result.type.js';
import type { PaymentTariff } from './types/payment-tariff.type.js';
import type { RpcResponse } from './types/rpc-response.type.js';
import type { SubscriptionPaymentHistoryItem } from './types/subscription-payment-history-item.type.js';

export const PAYMENTS_TCP_SERVICE = 'PAYMENTS_TCP_SERVICE';

@Injectable()
export class PaymentsTcpService {
  constructor(
    @Inject(PAYMENTS_TCP_SERVICE) private readonly paymentsClient: ClientProxy,
  ) {}

  async getTariffs(type: SubscriptionTypeName): Promise<PaymentTariff[]> {
    const result = await this.send<RpcResponse<PaymentTariff[]>>(
      'get-tariffs',
      { type },
    );

    if (result.error || !result.data) {
      throw new Error(
        result.error?.errors?.[0]?.message ?? 'Failed to get tariffs',
      );
    }

    return result.data;
  }

  async getSubscriptionTypes(): Promise<SubscriptionTypeContract[]> {
    const result = await this.send<RpcResponse<SubscriptionTypeContract[]>>(
      'get-subscription-types',
      {},
    );

    if (result.error || !result.data) {
      throw new Error(
        result.error?.errors?.[0]?.message ??
          'Failed to get subscription types',
      );
    }

    return result.data;
  }

  createPayment(
    payload: CreatePaymentContract,
  ): Promise<RpcResponse<PaymentResult>> {
    return this.send<RpcResponse<PaymentResult>>('create-payment', payload);
  }

  cancelSubscription(userId: string): Promise<RpcResponse<boolean>> {
    return this.send<RpcResponse<boolean>>('cancel-subscription', { userId });
  }

  async processYookassaNotification(yookassaPaymentId: string): Promise<void> {
    const response = await this.send<RpcResponse<null>>(
      'process-yookassa-notification',
      { eventId: randomUUID(), providerPaymentId: yookassaPaymentId },
    );
    if (response.error)
      throw new Error('Payment notification processing failed');
  }

  getCurrentSubscription(
    userId: string,
  ): Promise<RpcResponse<CurrentSubscriptionResult>> {
    return this.send<RpcResponse<CurrentSubscriptionResult>>(
      'get-current-subscription',
      { userId },
    );
  }

  getSubscriptionHistory(
    userId: string,
  ): Promise<RpcResponse<SubscriptionPaymentHistoryItem[]>> {
    return this.send<RpcResponse<SubscriptionPaymentHistoryItem[]>>(
      'get-subscription-history',
      { userId },
    );
  }

  private send<T>(cmd: string, payload: unknown): Promise<T> {
    return lastValueFrom(
      this.paymentsClient.send<T>({ cmd }, payload).pipe(timeout(5_000)),
    );
  }
}
