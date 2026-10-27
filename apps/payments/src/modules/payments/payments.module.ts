import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TariffsController } from './api/tariffs.controller.js';
import { SubscriptionsController } from './api/subscriptions.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { GetTariffsQueryHandler } from './application/query-handler/get-tariffs.query-handler.js';
import { GetSubscriptionTypesQueryHandler } from './application/query-handler/get-subscription-types.query-handler.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { TariffsRepository } from './infrastructure/repositories/tariffs/tariffs.repository.js';
import { TariffsQueryRepository } from './infrastructure/repositories/tariffs/tariffs.query.repository.js';
import { SubscriptionTypesQueryRepository } from './infrastructure/repositories/subscription-types/subscription-types.query.repository.js';
import { PaymentsRepository } from './infrastructure/repositories/payments/payments.repository.js';
import { PaymentsQueryRepository } from './infrastructure/repositories/payments/payments.query.repository.js';
import { SubscriptionsRepository } from './infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { BonusesRepository } from './infrastructure/repositories/bonuses/bonuses.repository.js';
import { StripeService } from './infrastructure/providers/stripe/stripe.service.js';
import { YookassaService } from './infrastructure/providers/yookassa/yookassa.service.js';
import { PaymentProviderFactory } from './infrastructure/providers/payment-provider.factory.js';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case.js';
import { GetCurrentSubscriptionQueryHandler } from './application/query-handler/get-current-subscription.query-handler.js';
import { GetSubscriptionHistoryQueryHandler } from './application/query-handler/get-subscription-history.query-handler.js';
import { RenewSubscriptionsUseCase } from './application/use-cases/renew-subscriptions.usecase.js';
import { SubscriptionsScheduler } from './application/subscriptions.scheduler.js';

const controllers = [
  TariffsController,
  SubscriptionsController,
  PaymentsController,
];

const queryHandlers = [
  GetTariffsQueryHandler,
  GetSubscriptionTypesQueryHandler,
  GetCurrentSubscriptionQueryHandler,
  GetSubscriptionHistoryQueryHandler,
];

const useCases = [
  CreatePaymentUseCase,
  CancelSubscriptionUseCase,
  RenewSubscriptionsUseCase,
];

const repositories = [
  TariffsRepository,
  TariffsQueryRepository,
  SubscriptionTypesQueryRepository,
  PaymentsRepository,
  PaymentsQueryRepository,
  SubscriptionsRepository,
  BonusesRepository,
];

const providers = [
  StripeService,
  YookassaService,
  PaymentProviderFactory,
  SubscriptionsScheduler,
];

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [...queryHandlers, ...useCases, ...repositories, ...providers],
  exports: [...repositories, ...providers],
})
export class PaymentsModule {}
