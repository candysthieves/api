import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
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
  constructor(private readonly outboxService: OutboxService) {}

  async execute(command: AcceptYookassaWebhookCommand): Promise<void> {
    if (
      command.event !== 'payment.succeeded' &&
      command.event !== 'payment.canceled'
    )
      return;
    await this.outboxService.savePaymentWebhook(command.externalPaymentId);
  }
}
