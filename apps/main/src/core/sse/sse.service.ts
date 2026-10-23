import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { SseEvent, SseEventEnum } from './types/sse-event.type.js';
import { SseEventData } from './types/sse-event-data.type.js';
import type { PaymentStatusChangedEvent } from '@libs/contracts';

@Injectable()
export class SseService {
  private readonly events$ = new Subject<SseEvent>();

  // Возвращает поток событий для SSE-подключений.
  getEvents(): Observable<SseEvent> {
    return this.events$.asObservable();
  }

  // Отправляет событие подписчикам.
  emit(type: SseEventEnum, data: SseEventData): void {
    this.events$.next({
      type,
      data,
    });
  }

  // Отправляет событие об изменении аватара.
  emitAvatarUpdated(userId: number): void {
    this.emit(SseEventEnum.AVATAR_UPDATED, { userId: String(userId) });
  }

  // Отправляет событие о готовности изображений поста.
  emitPostMediaUpdated(postId: string): void {
    this.emit(SseEventEnum.POST_MEDIA_UPDATED, { postId });
  }

  emitPaymentStatusUpdated(data: PaymentStatusChangedEvent['data']): void {
    this.emit(SseEventEnum.PAYMENT_STATUS_UPDATED, data);
  }
}
