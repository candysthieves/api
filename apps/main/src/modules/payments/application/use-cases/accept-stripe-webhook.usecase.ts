import { Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AcceptStripeWebhookUseCase.name);

  constructor(private readonly outboxService: OutboxService) {}

  async execute(command: AcceptStripeWebhookCommand): Promise<void> {
    this.logger.log(
      `[Stripe Webhook UseCase] Executing: type=${command.type}, externalPaymentId=${command.externalPaymentId}`,
    );
    if (
      command.type !== 'checkout.session.completed' &&
      command.type !== 'checkout.session.expired'
    ) {
      this.logger.warn(
        `[Stripe Webhook UseCase] Ignoring Stripe webhook with unhandled type: ${command.type}`,
      );
      return;
    }
    if (!command.externalPaymentId) {
      this.logger.error(
        `[Stripe Webhook UseCase] externalPaymentId is empty/undefined for type=${command.type}!`,
      );
      return;
    }
    this.logger.log(
      `[Stripe Webhook UseCase] Saving to outbox: externalPaymentId=${command.externalPaymentId}`,
    );
    await this.outboxService.savePaymentWebhook(command.externalPaymentId);
  }
}
