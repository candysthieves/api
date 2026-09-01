import { SseEventData } from './sse-event-data.type.js';

export enum SseEventEnum {
  POST_CREATED = 'post-created',
  POST_DELETED = 'post-deleted',
  POST_RESTORED = 'post-restored',
  AVATAR_UPDATED = 'avatar-updated',
}

export type SseEvent = {
  type: SseEventEnum;
  data: SseEventData;
};
