import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MainRabbitMqProducerService } from './main-rabbitmq-producer.service.js';

@ApiExcludeController()
@Controller('test/rabbit')
export class RabbitMqTestController {
  constructor(private readonly rabbitMqProducer: MainRabbitMqProducerService) {}

  @Get()
  async send(@Query('text') text?: string) {
    const message = text?.trim();

    if (!message) {
      throw new BadRequestException('Query parameter "text" is required');
    }

    await this.rabbitMqProducer.send({ text: message });
    return { sent: true };
  }
}
