import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FilesEventsService } from './files-events.service.js';
@Controller()
export class FilesEventsController {
  constructor(private readonly events: FilesEventsService) {}
  @MessagePattern({ cmd: 'post-media-event-ack' })
  acknowledge(@Payload() body: { eventId: string }) {
    return this.events.acknowledge(body.eventId);
  }
}
