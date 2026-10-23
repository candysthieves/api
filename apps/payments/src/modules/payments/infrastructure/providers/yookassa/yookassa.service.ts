import { Injectable } from '@nestjs/common';
import { type ICreatePayment, YooCheckout } from '@a2seven/yoo-checkout';
import { PaymentsConfig } from '../../../../../payments.config.js';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  CreateRecurringPaymentParams,
  IPaymentProvider,
  YookassaPayment,
} from '../payment-provider.interface.js';

// Курс пересчёта долларовой цены тарифа в рубли для YooKassa.
// TODO: Получать обновляемый курс USD/RUB через Redis и сохранять применённый курс вместе с платежом для проверки webhook.
export const USD_TO_RUB_RATE = 84.13;

/** Адаптер для создания и проверки платежей через YooKassa. */
@Injectable()
export class YookassaService implements IPaymentProvider {
  private readonly checkout: YooCheckout;

  /** Создаёт SDK-клиент YooKassa с учётными данными магазина. */
  constructor(private readonly config: PaymentsConfig) {
    this.checkout = new YooCheckout({
      shopId: config.yooKassaShopId,
      secretKey: config.yooKassaSecretKey,
    });
  }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    // Убирает завершающие слеши, чтобы корректно собрать URL возврата.
    const frontendUrl = this.config.frontendUrl.replace(/\/+$/, '');
    const payload: ICreatePayment = {
      amount: this.convertUsdToRubAmount(params.amount),
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: `${frontendUrl}/payment/success?paymentId=${params.paymentId}`,
      },
      save_payment_method: true,
      description: params.description,
      metadata: { paymentId: params.paymentId },
    };
    const payment = await this.checkout.createPayment(
      payload,
      params.paymentId,
    );
    const paymentUrl = payment.confirmation?.confirmation_url;
    if (!paymentUrl) throw new Error('YooKassa confirmation URL is missing');
    return { externalPaymentId: payment.id, paymentUrl };
  }

  /** Списывает деньги с ранее сохранённого способа оплаты без редиректа пользователя. */
  async chargeSavedPaymentMethod(
    params: CreateRecurringPaymentParams,
  ): Promise<YookassaPayment> {

    return await this.checkout.createPayment(
      {
        amount: this.convertUsdToRubAmount(params.amount),
        capture: true,
        payment_method_id: params.paymentMethodId,
        description: params.description,
        metadata: { paymentId: params.idempotencyKey },
      },
      params.idempotencyKey,
    );
  }

  /** Получает актуальное состояние платежа по ID YooKassa. */
  async getPaymentByProviderId(
    providerPaymentId: string,
  ): Promise<YookassaPayment> {
    return await this.checkout.getPayment(providerPaymentId);
  }

  /** Переводит сумму из долларов в формат суммы YooKassa в рублях. */
  private convertUsdToRubAmount(amount: number) {
    const amountInMinorUnits = Math.round(amount * USD_TO_RUB_RATE);
    return {
      value: (amountInMinorUnits / 100).toFixed(2),
      currency: 'RUB',
    };
  }
}
