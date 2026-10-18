import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailAdapter } from '../../../../core/adapters/email/email.adapter.js';
import { emailTemplates } from '../../../../core/adapters/email/email.templates.js';
import { UsersRepository } from '../../../user-accounts/infrastructure/repositories/user-repositories/users.repository.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';

@Injectable()
export class SubscriptionNotificationSchedulerService {
  private readonly logger = new Logger(
    SubscriptionNotificationSchedulerService.name,
  );
  private running = false;

  constructor(
    private readonly payments: PaymentsTcpService,
    private readonly users: UsersRepository,
    private readonly email: EmailAdapter,
  ) {}

  @Cron('* * * * * *')
  async process(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result =
        await this.payments.getPendingSubscriptionNotifications(20);
      if (result.error || !result.data) return;
      for (const notification of result.data) {
        try {
          const user = await this.users.findByIdOrNotFound(
            Number(notification.userId),
          );
          if (!user.email) continue;
          const template =
            notification.kind === 'RENEWAL_RETRY_SCHEDULED'
              ? emailTemplates.renewalRetryScheduled()
              : emailTemplates.subscriptionEndedAfterRetry();
          await this.email.sendEmail(user.email, template);
          const ack = await this.payments.acknowledgeSubscriptionNotification(
            notification.id,
          );
          if (ack.error) throw new Error('Notification acknowledgement failed');
        } catch (error) {
          this.logger.warn(
            `Subscription notification ${notification.id} remains pending`,
            error instanceof Error ? error.message : undefined,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Subscription notification batch failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
