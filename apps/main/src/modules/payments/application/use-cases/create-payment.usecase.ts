import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PaymentsTcpService,
  type PaymentResult,
  type RpcResponse,
} from '../payments-tcp.service.js';
import { PaymentsMapper } from '../../api/mappers/payments.mapper.js';
import { PaymentViewType } from '../../api/view-types/payment-view.type.js';
import { type PaymentProvider } from '@libs/contracts';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly tariffId: number,
    public readonly paymentProvider: PaymentProvider,
  ) {}
}

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentUseCase implements ICommandHandler<
  CreatePaymentCommand,
  PaymentViewType
> {
  constructor(private readonly paymentsTcpService: PaymentsTcpService) {}

  async execute(command: CreatePaymentCommand): Promise<PaymentViewType> {
    const response: RpcResponse<PaymentResult> =
      await this.paymentsTcpService.createPayment({
        userId: command.userId,
        tariffId: command.tariffId,
        provider: command.paymentProvider,
      });

    if (response.error || !response.data) {
      const error = response.error;
      const field = error?.errors?.[0]?.field ?? 'payment';
      const message = error?.errors?.[0]?.message ?? 'Payment creation failed';

      if (error?.code === 'TARIFF_NOT_FOUND') {
        DomainExceptions.notFound(ErrorStatus.TARIFF_NOT_FOUND, field, message);
      }

      if (error?.code === 'UNSUPPORTED_PAYMENT_PROVIDER') {
        DomainExceptions.badRequest(
          ErrorStatus.UNSUPPORTED_PAYMENT_PROVIDER,
          field,
          message,
        );
      }

      if (error?.code === 'VALIDATION_ERROR') {
        if (error.errors?.length) {
          DomainExceptions.validation(error.errors);
        }
        DomainExceptions.badRequest(
          ErrorStatus.VALIDATION_ERROR,
          field,
          message,
        );
      }

      DomainExceptions.badRequest(
        ErrorStatus.PAYMENT_CREATION_FAILED,
        field,
        message,
      );
    }

    return PaymentsMapper.toView(response.data);
  }
}
