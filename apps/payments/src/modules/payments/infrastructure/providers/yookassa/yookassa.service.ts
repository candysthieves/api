import { Injectable } from '@nestjs/common';
import { PaymentsConfig } from '../../../../../payments.config.js';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  CreateRecurringPaymentParams,
  IPaymentProvider,
  YookassaPayment,
} from '../payment-provider.interface.js';

export const USD_TO_RUB_RATE = 84.13;

@Injectable()
export class YookassaService implements IPaymentProvider {
  private readonly apiUrl = 'https://api.yookassa.ru/v3/payments';

  constructor(private readonly config: PaymentsConfig) {}

  /** Создаёт платёж и возвращает ссылку для перехода к оплате. */
  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const frontendUrl = this.config.frontendUrl.replace(/\/+$/, '');
    const returnUrl = `${frontendUrl}/payment/success?paymentId=${params.paymentId}`;
    const body = {
      amount: this.convertUsdToRubAmount(params.amount),
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      save_payment_method: true,
      description: params.description,
      metadata: { paymentId: params.paymentId },
    };
    const payment = await this.sendYookassaRequest(
      this.apiUrl,
      'POST',
      params.paymentId,
      body,
    );

    const paymentUrl = payment.confirmation?.confirmation_url;
    if (!paymentUrl) throw new Error('YooKassa confirmation URL is missing');
    return { externalPaymentId: payment.id, paymentUrl };
  }

  /** Выполняет повторное списание по сохранённому способу оплаты. */
  chargeSavedPaymentMethod(
    params: CreateRecurringPaymentParams,
  ): Promise<YookassaPayment> {
    const body = {
      amount: this.convertUsdToRubAmount(params.amount),
      capture: true,
      payment_method_id: params.paymentMethodId,
      description: params.description,
    };
    return this.sendYookassaRequest(
      this.apiUrl,
      'POST',
      params.idempotencyKey,
      body,
    );
  }

  /** Запрашивает состояние платежа в YooKassa по его внешнему ID. */
  getPaymentByProviderId(providerPaymentId: string): Promise<YookassaPayment> {
    const paymentUrl = `${this.apiUrl}/${encodeURIComponent(
      providerPaymentId,
    )}`;
    return this.sendYookassaRequest(paymentUrl, 'GET');
  }

  /** Переводит сумму из USD в RUB и форматирует её для API YooKassa. */
  private convertUsdToRubAmount(amount: number) {
    const amountInMinorUnits = Math.round(amount * USD_TO_RUB_RATE);
    const value = (amountInMinorUnits / 100).toFixed(2);

    return {
      value,
      currency: 'RUB',
    };
  }

  /** Отправляет авторизованный запрос в API YooKassa и проверяет ответ. */
  private async sendYookassaRequest(
    url: string,
    method: 'GET' | 'POST',
    idempotencyKey?: string,
    body?: Record<string, unknown>,
  ): Promise<YookassaPayment> {
    const credentials = `${this.config.yooKassaShopId}:${this.config.yooKassaSecretKey}`;
    const authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
    const headers: Record<string, string> = {
      Authorization: authorization,
      'Content-Type': 'application/json',
    };
    if (idempotencyKey) headers['Idempotence-Key'] = idempotencyKey;

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(10_000),
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error(`YooKassa request failed with HTTP ${response.status}`);
    }

    return (await response.json()) as YookassaPayment;
  }
}
