import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GetTariffsQueryHandler } from './application/query-handler/get-tariffs.query-handler.js';
import { GetSubscriptionTypesQueryHandler } from './application/query-handler/get-subscription-types.query-handler.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.usecase.js';
import {
  PaymentsTcpService,
  PAYMENTS_TCP_SERVICE,
} from './application/payments-tcp.service.js';
import { TariffsController } from './api/tariffs.controller.js';
import { SubscriptionTypesController } from './api/subscription-types.controller.js';
import { PaymentsController } from './api/payments.controller.js';
import { SubscriptionsController } from './api/subscriptions.controller.js';
import { CancelSubscriptionUseCase } from './application/use-cases/cancel-subscription.usecase.js';
import { GetCurrentSubscriptionQueryHandler } from './application/query-handler/get-current-subscription.query-handler.js';
import { EventsModule } from '../../core/events/events.module.js';
import { AcceptYookassaWebhookUseCase } from './application/use-cases/accept-yookassa-webhook.usecase.js';

const controllers = [
  TariffsController,
  SubscriptionTypesController,
  PaymentsController,
  SubscriptionsController,
];
const queryHandlers = [
  GetTariffsQueryHandler,
  GetSubscriptionTypesQueryHandler,
  GetCurrentSubscriptionQueryHandler,
];
const useCases = [
  CreatePaymentUseCase,
  CancelSubscriptionUseCase,
  AcceptYookassaWebhookUseCase,
];
const services = [PaymentsTcpService];

@Module({
  imports: [
    EventsModule,
    ClientsModule.registerAsync([
      {
        name: PAYMENTS_TCP_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('PAYMENTS_TCP_HOST'),
            port: config.getOrThrow<number>('PAYMENTS_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  controllers: [...controllers],
  providers: [...queryHandlers, ...useCases, ...services],
  exports: [...services],
})
export class PaymentsModule {}
