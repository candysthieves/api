import { Injectable } from '@nestjs/common';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  IPaymentProvider,
} from '../payment-provider.interface.js';

@Injectable()
export class YookassaService implements IPaymentProvider {
  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    await Promise.resolve(params);

    return {
      externalPaymentId: '',
      paymentUrl: '',
    };
  }
}
