export interface NotificationEventRecord {
  eventId: string;
  status: 'UNPROCESSED' | 'PROCESSING' | 'OK' | 'ERROR';
  data: string | null;
  attempts: number;
  createdAt: number;
  processingStartedAt: number | null;
  nextAttemptAt: number | null;
  completedAt: number | null;
  lastError: string | null;
}
