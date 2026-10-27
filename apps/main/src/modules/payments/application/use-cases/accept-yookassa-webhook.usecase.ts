import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OutboxService } from '../../../../core/events/outbox/outbox.service.js';

export class AcceptYookassaWebhookCommand {
  constructor(
    public readonly event: string,
    public readonly externalPaymentId: string,
  ) {}
}

@CommandHandler(AcceptYookassaWebhookCommand)
export class AcceptYookassaWebhookUseCase implements ICommandHandler<
  AcceptYookassaWebhookCommand,
  void
> {
  private readonly logger = new Logger(AcceptYookassaWebhookUseCase.name);

  constructor(private readonly outboxService: OutboxService) {}

  async execute(command: AcceptYookassaWebhookCommand): Promise<void> {
    const context = {
      event: command.event,
      externalPaymentId: command.externalPaymentId,
    };
    this.logger.log({ message: 'YooKassa notification received', ...context });
    if (
      command.event !== 'payment.succeeded' &&
      command.event !== 'payment.canceled'
    ) {
      this.logger.warn({
        message: 'YooKassa notification ignored: unsupported event',
        ...context,
      });
      return;
    }
    try {
      await this.outboxService.savePaymentWebhook(command.externalPaymentId);
      this.logger.log({
        message: 'YooKassa notification persisted to outbox',
        ...context,
      });
    } catch (error) {
      this.logger.error({
        message: 'YooKassa notification persistence failed',
        ...context,
      });
      throw error;
    }
  }
}
