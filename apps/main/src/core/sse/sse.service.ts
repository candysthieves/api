import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { SseEvent, SseEventEnum } from './types/sse-event.type.js';
import { SseEventData } from './types/sse-event-data.type.js';

@Injectable()
export class SseService {
  private readonly events$ = new Subject<SseEvent>();

  getEvents(): Observable<SseEvent> {
    return this.events$.asObservable();
  }

  emit(type: SseEventEnum, data: SseEventData): void {
    this.events$.next({
      type,
      data,
    });
  }
}
