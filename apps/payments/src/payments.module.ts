import { PaymentsController } from './payments.controller.js';
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { configModule } from './config.js';
import { PaymentsConfig } from './payments.config.js';

@Module({
  imports: [configModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsConfig],
})
export class PaymentsModule {}
