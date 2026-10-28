import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { CreatePaymentContract } from '@libs/contracts';
import type {
  SubscriptionTypeContract,
  SubscriptionTypeName,
  SubscriptionHistoryContract,
  GetSubscriptionHistoryContract,
} from '@libs/contracts';

export type PaymentTariff = {
  id: number;
  tariff_name: string;
  durationDays: number;
  price: string;
};

export type PaymentResult = {
  paymentId: string;
  paymentUrl: string;
};

export type CurrentSubscription = {
  expirationDate: string | null;
  nextChangeDate: string | null;
};

export type RpcResponse<T> = {
  data: T | null;
  error: {
    code?: string;
    errors?: { field: string; message: string }[];
  } | null;
};

export const PAYMENTS_TCP_SERVICE = 'PAYMENTS_TCP_SERVICE';

@Injectable()
export class PaymentsTcpService {
  constructor(
    @Inject(PAYMENTS_TCP_SERVICE) private readonly paymentsClient: ClientProxy,
  ) {}

  async getTariffs(type: SubscriptionTypeName): Promise<PaymentTariff[]> {
    const result = await lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<PaymentTariff[]>>({ cmd: 'get-tariffs' }, { type })
        .pipe(timeout(10_000)),
    );

    if (result.error || !result.data) {
      throw new Error(
        result.error?.errors?.[0]?.message ?? 'Failed to get tariffs',
      );
    }

    return result.data;
  }

  async getSubscriptionTypes(): Promise<SubscriptionTypeContract[]> {
    const result = await lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<SubscriptionTypeContract[]>>(
          { cmd: 'get-subscription-types' },
          {},
        )
        .pipe(timeout(10_000)),
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
    return lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<PaymentResult>>({ cmd: 'create-payment' }, payload)
        .pipe(timeout(15_000)),
    );
  }

  cancelSubscription(userId: string): Promise<RpcResponse<boolean>> {
    return lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<boolean>>({ cmd: 'cancel-subscription' }, { userId })
        .pipe(timeout(15_000)),
    );
  }

  getSubscriptionHistory(
    payload: GetSubscriptionHistoryContract,
  ): Promise<RpcResponse<SubscriptionHistoryContract>> {
    return lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<SubscriptionHistoryContract>>(
          { cmd: 'get-subscription-history' },
          payload,
        )
        .pipe(timeout(10_000)),
    );
  }

  getCurrentSubscription(
    userId: string,
  ): Promise<RpcResponse<CurrentSubscription>> {
    return lastValueFrom(
      this.paymentsClient
        .send<RpcResponse<CurrentSubscription>>(
          { cmd: 'get-current-subscription' },
          { userId },
        )
        .pipe(timeout(10_000)),
    );
  }
}
