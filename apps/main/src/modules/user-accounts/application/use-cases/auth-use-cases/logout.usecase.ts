import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtRefreshPayload } from '../../../../../core/types/jwt-payload.type.js';
import { SessionsRepository } from '../../../repositories/session-repositories/sessions.repository.js';

export class LogoutCommand {
  constructor(public readonly payload: JwtRefreshPayload) {}
}

@CommandHandler(LogoutCommand)
export class LogoutUseCase implements ICommandHandler<LogoutCommand> {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute(command: LogoutCommand): Promise<void> {
    await this.sessionsRepository.deleteById(
      command.payload.sessionId,
      command.payload.userId,
    );
  }
}
