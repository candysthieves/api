import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TariffsRepository } from '../../infrastructure/repositories/tariffs/tariffs.repository.js';
import { PaymentProvider } from '../../../../database/types/payment-database.type.js';

export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly tariffId: string,
    public readonly provider: PaymentProvider,
  ) {}
}

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentUseCase implements ICommandHandler<CreatePaymentCommand> {
  constructor(private readonly tariffsRepository: TariffsRepository) {}

  async execute({ tariffId }: CreatePaymentCommand) {
    await this.tariffsRepository.findTariffById(tariffId);
  }
}
