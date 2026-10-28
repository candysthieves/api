import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';
import type { SubscriptionEntity } from '../../../../database/types/payment-database.type.js';
import { MainTcpService } from './main-tcp.service.js';

@Injectable()
export class SubscriptionExpirationService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly mainTcpService: MainTcpService,
  ) {}

  async expire(userId: string): Promise<void> {
    const paid = await this.subscriptionsRepository.findPaidSubscription(
      userId,
      new Date(),
    );
    if (paid) return;
    await this.mainTcpService.setPersonalStatusForUser(userId);
  }

  async fail(subscription: SubscriptionEntity): Promise<void> {
    if (subscription.provider === 'YOOKASSA') {
      await this.expire(subscription.userId);
    }
    await this.subscriptionsRepository.fail(subscription.id);
  }
}
