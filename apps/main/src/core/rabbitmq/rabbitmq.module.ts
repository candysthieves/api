import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MainRabbitMqConsumerController } from './main-rabbitmq-consumer.controller.js';
import { MainRabbitMqProducerService } from './main-rabbitmq-producer.service.js';

export const FILES_RMQ_CLIENT = 'FILES_RMQ_CLIENT';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: FILES_RMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.getOrThrow<string>('RABBITMQ_MAIN_TO_FILES_QUEUE'),
          },
        }),
      },
    ]),
  ],
  controllers: [MainRabbitMqConsumerController],
  providers: [MainRabbitMqProducerService],
  exports: [MainRabbitMqProducerService],
})
export class RabbitMqModule {}
