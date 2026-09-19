import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MainRabbitMqProducerService } from './main-rabbitmq-producer.service.js';

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const inputEvents = `${config.getOrThrow<string>('RABBITMQ_MAIN_TO_FILES_QUEUE')}.post-images.v1`;
        const results = `${config.getOrThrow<string>('RABBITMQ_FILES_TO_MAIN_QUEUE')}.post-images.results.v1`;
        const imageQueueOptions = {
          durable: true,
          arguments: { 'x-single-active-consumer': true },
        };
        return {
          uri: config.getOrThrow<string>('RABBITMQ_URL'),
          prefetchCount: config.getOrThrow<number>('RABBITMQ_PREFETCH_COUNT'),
          enableDirectReplyTo: false,
          queues: [
            { name: inputEvents, options: imageQueueOptions },
            { name: results, options: { durable: true } },
          ],
          handlers: {
            postImageResults: {
              exchange: '',
              routingKey: results,
              queue: results,
              queueOptions: { durable: true },
              deserializer: (body: Buffer) => body,
            },
          },
        };
      },
    }),
  ],
  providers: [MainRabbitMqProducerService],
  exports: [MainRabbitMqProducerService],
})
export class RabbitMqModule {}
