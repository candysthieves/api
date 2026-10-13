import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { GetTariffsQueryHandler } from './application/get-tariffs.query-handler.js';
import {
  PaymentsTcpService,
  PAYMENTS_TCP_SERVICE,
} from './application/payments-tcp.service.js';
import { TariffsController } from './api/tariffs.controller.js';

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
  controllers: [TariffsController],
  providers: [PaymentsTcpService, GetTariffsQueryHandler],
})
export class TariffsModule {}
