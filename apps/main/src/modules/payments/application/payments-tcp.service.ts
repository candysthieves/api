import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

export type PaymentTariff = {
  id: string;
  name: string;
  durationDays: number;
  priceInMinorUnits: string;
};

export const PAYMENTS_TCP_SERVICE = 'PAYMENTS_TCP_SERVICE';

@Injectable()
export class PaymentsTcpService {
  constructor(
    @Inject(PAYMENTS_TCP_SERVICE) private readonly paymentsClient: ClientProxy,
  ) {}

  async getTariffs(): Promise<PaymentTariff[]> {
    const result = await lastValueFrom(
      this.paymentsClient
        .send<{
          data: PaymentTariff[] | null;
          error: { errors?: { message?: string }[] } | null;
        }>({ cmd: 'get-tariffs' }, {})
        .pipe(timeout(5_000)),
    );

    if (result.error || !result.data) {
      throw new Error(
        result.error?.errors?.[0]?.message ?? 'Failed to get tariffs',
      );
    }

    return result.data;
  }
}
