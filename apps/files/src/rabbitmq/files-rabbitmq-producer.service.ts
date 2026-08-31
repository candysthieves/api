import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { RabbitMessageDto } from './dto/rabbit-message.dto.js';

const MAIN_RMQ_CLIENT = 'MAIN_RMQ_CLIENT';

@Injectable()
export class FilesRabbitMqProducerService {
  constructor(
    @Inject(MAIN_RMQ_CLIENT) private readonly mainClient: ClientProxy,
  ) {}

  async sendTestResponse(response: RabbitMessageDto): Promise<void> {
    await lastValueFrom(this.mainClient.emit('rabbit.test.response', response));
  }
}
