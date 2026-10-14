import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

export class CreatePaymentCommand {
  constructor() {}
}

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentUseCase implements ICommandHandler<CreatePaymentCommand> {
  async execute() {}
}
