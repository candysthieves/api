import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RabbitMessageDto } from './dto/rabbit-message.dto.js';

const FILES_RMQ_CLIENT = 'FILES_RMQ_CLIENT';
@Injectable()
export class MainRabbitMqProducerService {
  constructor(
    @Inject(FILES_RMQ_CLIENT) private readonly filesClient: ClientProxy,
  ) {}

  async send(message: RabbitMessageDto): Promise<void> {
    await lastValueFrom(this.filesClient.emit('rabbit.test.request', message));
  }
}
