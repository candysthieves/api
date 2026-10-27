import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { PaymentProvider } from '../../../../database/types/payment-database.type.js';
import { PaymentFactory } from '../factories/payment.factory.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { PaymentProviderFactory } from '../../infrastructure/providers/payment-provider.factory.js';
import { PaymentParamsFactory } from '../factories/payment-params.factory.js';
import { PaymentsMapper } from '../../api/mappers/payments.mapper.js';
import { PaymentViewType } from '../../api/view-types/payment-view.type.js';
import { randomUUID } from 'node:crypto';
import { RpcException } from '@nestjs/microservices';
import { ObjectResult } from '../../../../core/object-result.js';
import { SubscriptionsRepository } from '../../infrastructure/repositories/subscriptions/subscriptions.repository.js';

export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly tariffId: number,
    public readonly provider: PaymentProvider,
  ) {}
}

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentUseCase implements ICommandHandler<
  CreatePaymentCommand,
  PaymentViewType
> {
  constructor(
    private readonly tariffsRepository: TariffsRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentProviderFactory: PaymentProviderFactory,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute({
    userId,
    tariffId,
    provider,
  }: CreatePaymentCommand): Promise<PaymentViewType> {
    const latest = await this.subscriptionsRepository.findLatest(userId);
    if (latest?.status === 'Processing') {
      throw new RpcException(
        ObjectResult.failure({
          code: 'PAYMENT_CREATION_FAILED',
          errors: [
            {
              field: 'subscription',
              message: 'The latest subscription is still processing',
            },
          ],
        }),
      );
    }
    const tariff = await this.tariffsRepository.findTariffById(tariffId);

    const paymentId = randomUUID();
    const paymentService = this.paymentProviderFactory.getProvider(provider);
    const subscriptionId = randomUUID();
    await this.subscriptionsRepository.createProcessing(
      subscriptionId,
      userId,
      tariffId,
      provider,
      tariff.durationDays,
    );
    if (latest) {
      await this.subscriptionsRepository.requestCancellation(latest.id);
    }

    const paymentParams = PaymentParamsFactory.create(
      paymentId,
      tariff,
      provider === 'YOOKASSA' ? 'RUB' : 'USD',
    );

    const { paymentUrl, externalPaymentId } =
      await paymentService.createPayment(paymentParams);

    const payment = PaymentFactory.create(
      userId,
      tariffId,
      provider,
      externalPaymentId,
      Number(tariff.price),
      paymentId,
    );
    await this.paymentsRepository.create(payment);
    await this.subscriptionsRepository.addPaymentIdToSubscriptions(
      subscriptionId,
      payment.id,
    );

    return PaymentsMapper.toView(payment.id, paymentUrl);
  }
}
