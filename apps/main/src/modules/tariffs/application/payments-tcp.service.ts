import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

export type PaymentTariff = {
  id: string;
  name: string;
  durationDays: number;
  price: string;
};

export const PAYMENTS_TCP_SERVICE = 'PAYMENTS_TCP_SERVICE';

@Injectable()
export class PaymentsTcpService {
  constructor(
    @Inject(PAYMENTS_TCP_SERVICE) private readonly paymentsClient: ClientProxy,
  ) {}

  getTariffs(): Promise<PaymentTariff[]> {
    return lastValueFrom(
      this.paymentsClient
        .send<PaymentTariff[]>({ cmd: 'get-tariffs' }, {})
        .pipe(timeout(5_000)),
    );
  }
}
