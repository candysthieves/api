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
import { SubscriptionsRepository } from './infrastructure/repositories/subscriptions/subscriptions.repository.js';
import { SubscriptionsQueryRepository } from './infrastructure/repositories/subscriptions/subscriptions.query.repository.js';
import { StripeService } from './infrastructure/providers/stripe/stripe.service.js';
import { YookassaService } from './infrastructure/providers/yookassa/yookassa.service.js';
import { PaymentProviderFactory } from './infrastructure/providers/payment-provider.factory.js';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.use-case.js';
import { ProcessYookassaNotificationUseCase } from './application/use-cases/process-yookassa-notification.usecase.js';
import { ProcessDueSubscriptionsUseCase } from './application/use-cases/process-due-subscriptions.usecase.js';
import { SubscriptionRenewalSchedulerService } from './application/services/subscription-renewal-scheduler.service.js';
import { GetCurrentSubscriptionQueryHandler } from './application/query-handler/get-current-subscription.query-handler.js';
import { GetSubscriptionHistoryQueryHandler } from './application/query-handler/get-subscription-history.query-handler.js';
import { PaymentEventsRepository } from './infrastructure/repositories/payment-events.repository.js';
import { PaymentEventsTransportModule } from './infrastructure/payment-events-transport.module.js';
import { PaymentEventsSchedulerService } from './application/services/payment-events-scheduler.service.js';

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
  ProcessYookassaNotificationUseCase,
  ProcessDueSubscriptionsUseCase,
];

const repositories = [
  TariffsRepository,
  TariffsQueryRepository,
  SubscriptionTypesQueryRepository,
  PaymentsRepository,
  SubscriptionsRepository,
  SubscriptionsQueryRepository,
];

const providers = [
  StripeService,
  YookassaService,
  PaymentProviderFactory,
  SubscriptionRenewalSchedulerService,
];

@Module({
  imports: [CqrsModule, PaymentEventsTransportModule],
  controllers: [...controllers],
  providers: [
    ...queryHandlers,
    ...useCases,
    ...repositories,
    ...providers,
    PaymentEventsRepository,
    PaymentEventsSchedulerService,
  ],
  exports: [...repositories, ...providers, PaymentEventsRepository],
})
export class PaymentsModule {}
