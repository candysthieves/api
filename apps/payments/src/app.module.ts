import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { configModule } from './config.js';
import { PaymentsConfig } from './payments.config.js';
import { DatabaseModule } from './database/database.module.js';
import { SubscriptionsController } from './api/subscriptions.controller.js';
import { GetTariffsQueryHandler } from './application/query-handler/get-tariffs.query-handler.js';
import { TariffsQueryRepository } from './infrastructure/repositories/tariffs/tariffs.query.repository.js';
import { PaymentsRepository } from './infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionsRepository } from './infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { BonusesRepository } from './infrastructure/repositories/bonuses/bonuses.repository.js';
import { StripeService } from './infrastructure/providers/stripe/stripe.service.js';
import { YookassaService } from './infrastructure/providers/yookassa/yookassa.service.js';
import { TariffsController } from './api/tariffs.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';

@Module({
  imports: [configModule, CqrsModule.forRoot(), DatabaseModule],
  controllers: [TariffsController, SubscriptionsController, PaymentsController],
  providers: [
    PaymentsConfig,
    GetTariffsQueryHandler,
    CreatePaymentUseCase,
    TariffsQueryRepository,
    PaymentsRepository,
    SubscriptionsRepository,
    BonusesRepository,
    StripeService,
    YookassaService,
  ],
  exports: [PaymentsConfig],
})
export class AppModule {}
