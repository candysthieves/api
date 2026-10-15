import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TariffsController } from './api/tariffs.controller.js';
import { SubscriptionsController } from './api/subscriptions.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { GetTariffsQueryHandler } from './application/query-handler/get-tariffs.query-handler.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { TariffsRepository } from './infrastructure/repositories/tariffs/tariffs.repository.js';
import { TariffsQueryRepository } from './infrastructure/repositories/tariffs/tariffs.query.repository.js';
import { PaymentsRepository } from './infrastructure/repositories/payments/payments.repository.js';
import { SubscriptionsRepository } from './infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { BonusesRepository } from './infrastructure/repositories/bonuses/bonuses.repository.js';
import { StripeService } from './infrastructure/providers/stripe/stripe.service.js';
import { YookassaService } from './infrastructure/providers/yookassa/yookassa.service.js';
import { PaymentProviderFactory } from './infrastructure/providers/payment-provider.factory.js';

const controllers = [
  TariffsController,
  SubscriptionsController,
  PaymentsController,
];

const queryHandlers = [GetTariffsQueryHandler];

const useCases = [CreatePaymentUseCase];

const repositories = [
  TariffsRepository,
  TariffsQueryRepository,
  PaymentsRepository,
  SubscriptionsRepository,
  BonusesRepository,
];

const providers = [StripeService, YookassaService, PaymentProviderFactory];

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [...queryHandlers, ...useCases, ...repositories, ...providers],
  exports: [...repositories, ...providers],
})
export class PaymentsModule {}
