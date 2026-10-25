export interface PaymentEventTable {
  eventId: string;
  status: 'UNPROCESSED' | 'PROCESSING' | 'OK' | 'ERROR';
  data: string | null;
  attempts: number | null;
  createdAt: number | null;
  processingStartedAt: number | null;
  nextAttemptAt: number | null;
  completedAt: number | null;
  lastError: string | null;
}
