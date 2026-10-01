import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { SseService } from './sse.service.js';
import { ApiSseEvents } from '../swagger/sse-dto/sse-events.swagger.js';

@ApiTags('Events')
@Controller('events')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse()
  @ApiSseEvents()
  events(): Observable<MessageEvent> {
    return this.sseService.getEvents().pipe(
      map((event) => ({
        type: event.type,
        data: event.data,
      })),
    );
  }
}
