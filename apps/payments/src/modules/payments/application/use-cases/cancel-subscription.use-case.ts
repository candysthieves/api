import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';

export class CancelSubscriptionCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(CancelSubscriptionCommand)
export class CancelSubscriptionUseCase implements ICommandHandler<
  CancelSubscriptionCommand,
  boolean
> {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute({ userId }: CancelSubscriptionCommand): Promise<boolean> {
    return this.subscriptionsRepository.requestCancellation(userId, new Date());
  }
}
