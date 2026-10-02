import { EventStoreService } from './event-store.service.js';
import { OutboxService } from './outbox/outbox.service.js';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { FilesTcpService, FILES_TCP_SERVICE } from './files-tcp.service.js';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module.js';

@Module({
  imports: [
    RabbitMqModule,
    ClientsModule.registerAsync([
      {
        name: FILES_TCP_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('FILES_TCP_HOST'),
            port: config.getOrThrow<number>('FILES_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  providers: [EventStoreService, OutboxService, FilesTcpService],
  exports: [OutboxService, EventStoreService, FilesTcpService, RabbitMqModule],
})
export class EventsModule {}
