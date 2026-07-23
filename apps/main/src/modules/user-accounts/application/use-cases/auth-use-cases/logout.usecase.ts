import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

export class LogoutCommand {
  constructor() {}
}

@CommandHandler(LogoutCommand)
export class LogoutUseCase implements ICommandHandler<LogoutCommand> {
  async execute(command: LogoutCommand): Promise<void> {}
}
