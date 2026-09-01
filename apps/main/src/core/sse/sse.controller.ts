import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { SseService } from './sse.service.js';

@Controller('events')
export class SeeController {
  constructor(private readonly sseService: SseService) {}

  @Sse()
  events(): Observable<MessageEvent> {
    return this.sseService.getEvents().pipe(
      map((event) => ({
        type: event.type,
        data: event.data,
      })),
    );
  }
}
