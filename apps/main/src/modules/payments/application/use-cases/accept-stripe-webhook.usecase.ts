import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { OutboxService } from '../../../../core/events/outbox/outbox.service.js';

export class AcceptStripeWebhookCommand {
  constructor(
    public readonly type: string,
    public readonly externalPaymentId: string,
  ) {}
}

@CommandHandler(AcceptStripeWebhookCommand)
export class AcceptStripeWebhookUseCase implements ICommandHandler<
  AcceptStripeWebhookCommand,
  void
> {
  constructor(private readonly outboxService: OutboxService) {}

  async execute(command: AcceptStripeWebhookCommand): Promise<void> {
    if (
      command.type !== 'checkout.session.completed' &&
      command.type !== 'checkout.session.expired'
    ) {
      return;
    }
    if (!command.externalPaymentId) {
      return;
    }
    await this.outboxService.savePaymentWebhook(command.externalPaymentId);
  }
}
