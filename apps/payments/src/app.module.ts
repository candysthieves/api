import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { PaymentsConfig } from './payments.config.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';

@Module({
  imports: [configModule, PaymentsModule, SubscriptionsModule],
  providers: [PaymentsConfig],
  exports: [PaymentsConfig],
})
export class AppModule {}
