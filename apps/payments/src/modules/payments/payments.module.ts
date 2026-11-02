import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import {
  MainTcpService,
  MAIN_TCP_CLIENT,
} from './application/services/main-tcp.service.js';
import { SubscriptionExpirationService } from './application/services/subscription-expiration.service.js';
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
  MainTcpService,
  SubscriptionExpirationService,
  StripeService,
  YookassaService,
  PaymentProviderFactory,
  SubscriptionsScheduler,
];

@Module({
  imports: [
    CqrsModule,
    ClientsModule.registerAsync([
      {
        name: MAIN_TCP_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('MAIN_TCP_HOST', '127.0.0.1'),
            port: Number(config.get<number>('MAIN_TCP_PORT', 4004)),
          },
        }),
      },
    ]),
  ],
  controllers: [...controllers],
  providers: [...queryHandlers, ...useCases, ...repositories, ...providers],
  exports: [...repositories, ...providers],
})
export class PaymentsModule {}
