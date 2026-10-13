import { Injectable } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  getHello(): string {
    return 'Payments service is working';
  }

  getTariffs() {
    return this.paymentsRepository.getTariffs();
  }
}
