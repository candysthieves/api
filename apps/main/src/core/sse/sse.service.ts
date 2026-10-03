import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { SseEvent, SseEventEnum } from './types/sse-event.type.js';
import { SseEventData } from './types/sse-event-data.type.js';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
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
    this.emit(SseEventEnum.AVATAR_UPDATED, { userId });
    this.logger.log(
      `SSE emitted: event=${SseEventEnum.AVATAR_UPDATED} userId=${userId}`,
    );
  }

  // Отправляет событие о готовности изображений поста.
  emitPostMediaUpdated(postId: string): void {
    this.emit(SseEventEnum.POST_MEDIA_UPDATED, { postId });
    this.logger.log(
      `Post READY; SSE emitted: event=${SseEventEnum.POST_MEDIA_UPDATED} postId=${postId}`,
    );
  }
}
