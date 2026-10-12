import { PaymentsService } from './payments.service.js';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getHello(): string {
    return this.paymentsService.getHello();
  }
}
