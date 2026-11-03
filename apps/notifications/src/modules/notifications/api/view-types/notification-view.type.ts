import { NotificationType } from '../../../../database/models/notification.model.js';

export type NotificationViewType = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};
