import { NotificationsCountViewType } from '../view-types/notifications-count-view.type.js';

export class NotificationsMapper {
  static toCountView(count: number): NotificationsCountViewType {
    return {
      count,
    };
  }
}
