import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SessionsRepository } from '../../../infrastructure/repositories/session-repositories/sessions.repository.js';

export class DeleteOtherSessionsCommand {
  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string,
  ) {}
}

@CommandHandler(DeleteOtherSessionsCommand)
export class DeleteOtherSessionsUsecase implements ICommandHandler<DeleteOtherSessionsCommand> {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute(command: DeleteOtherSessionsCommand): Promise<void> {
    await this.sessionsRepository.deleteOtherSessions(
      command.userId,
      command.currentSessionId,
    );
  }
}
