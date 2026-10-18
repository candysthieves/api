import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { PaymentProvider } from '../../../../database/types/payment-database.type.js';
import { PaymentFactory } from '../factories/payment.factory.js';
import { PaymentsRepository } from '../../infrastructure/repositories/payments/payments.repository.js';
import { PaymentProviderFactory } from '../../infrastructure/providers/payment-provider.factory.js';
import { PaymentParamsFactory } from '../factories/payment-params.factory.js';
import { PaymentsMapper } from '../../api/mappers/payments.mapper.js';
import { PaymentViewType } from '../../api/view-types/payment-view.type.js';

export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly tariffId: string,
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
  ) {}

  async execute({
    userId,
    tariffId,
    provider,
  }: CreatePaymentCommand): Promise<PaymentViewType> {
    const tariff = await this.tariffsRepository.findTariffById(tariffId);

    const payment = PaymentFactory.create(
      userId,
      tariffId,
      provider,
      'pending',
      tariff.priceInMinorUnits,
      'USD',
    );

    if (provider === 'YOOKASSA') {
      const existingPayment = await this.paymentsRepository.findById(
        payment.id,
      );
      if (!existingPayment) await this.paymentsRepository.create(payment);
    } else {
      await this.paymentsRepository.create(payment);
    }

    const paymentService = this.paymentProviderFactory.getProvider(provider);

    const paymentParams = PaymentParamsFactory.create(payment.id, tariff);

    const { paymentUrl, externalPaymentId } =
      await paymentService.createPayment(paymentParams);

    await this.paymentsRepository.setProviderPaymentId(
      payment.id,
      externalPaymentId,
    );

    return PaymentsMapper.toView(
      payment.id,
      provider === 'YOOKASSA' ? externalPaymentId : null,
      paymentUrl,
    );
  }
}
