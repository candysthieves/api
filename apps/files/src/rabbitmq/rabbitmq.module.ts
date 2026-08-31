import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FilesRabbitMqConsumerController } from './files-rabbitmq-consumer.controller.js';
import { FilesRabbitMqProducerService } from './files-rabbitmq-producer.service.js';

export const MAIN_RMQ_CLIENT = 'MAIN_RMQ_CLIENT';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: MAIN_RMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE'),
          },
        }),
      },
    ]),
  ],
  controllers: [FilesRabbitMqConsumerController],
  providers: [FilesRabbitMqProducerService],
  exports: [FilesRabbitMqProducerService],
})
export class RabbitMqModule {}
