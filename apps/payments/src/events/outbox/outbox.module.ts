import { Module } from '@nestjs/common';
import { RabbitMqModule } from '../../core/rabbitmq/rabbitmq.module.js';
import { OutboxRepository } from './outbox.repository.js';
import { OutboxService } from './outbox.service.js';

@Module({
  imports: [RabbitMqModule],
  providers: [OutboxRepository, OutboxService],
  exports: [OutboxRepository, OutboxService],
})
export class OutboxModule {}
