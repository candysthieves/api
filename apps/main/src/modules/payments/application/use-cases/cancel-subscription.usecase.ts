import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';
import { PaymentsTcpService } from '../payments-tcp.service.js';

export class CancelSubscriptionCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionUseCase implements ICommandHandler<
  CancelSubscriptionCommand,
  void
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute({ userId }: CancelSubscriptionCommand): Promise<void> {
    const response = await this.paymentsTcpService.cancelSubscription(userId);

    if (!response.error && response.data) return;

    if (response.error?.code === 'SUBSCRIPTION_NOT_FOUND') {
      DomainExceptions.notFound(
        ErrorStatus.SUBSCRIPTION_NOT_FOUND,
        'subscription',
        'No active subscription was found',
      );
    }

    DomainExceptions.serviceUnavailable(
      ErrorStatus.SUBSCRIPTION_CANCELLATION_FAILED,
      'subscription',
      response.error?.errors?.[0]?.message ??
        'Subscription cancellation failed',
    );
  }
}
