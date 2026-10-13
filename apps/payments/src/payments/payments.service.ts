import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  getHello(): string {
    return 'Payments service is working';
  }
}
