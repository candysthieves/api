import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GetTariffsQueryHandler } from './application/query-handler/get-tariffs.query-handler.js';
import {
  PaymentsTcpService,
  PAYMENTS_TCP_SERVICE,
} from './application/payments-tcp.service.js';
import { TariffsController } from './api/tariffs.controller.js';

const controllers = [TariffsController];
const queryHandlers = [GetTariffsQueryHandler];
const services = [PaymentsTcpService];

@Module({
  imports: [
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
  providers: [...queryHandlers, ...services],
  exports: [...services],
})
export class PaymentsModule {}
