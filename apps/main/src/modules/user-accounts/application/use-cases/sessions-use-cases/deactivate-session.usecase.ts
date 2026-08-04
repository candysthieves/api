import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SessionsRepository } from '../../../repositories/session-repositories/sessions.repository.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';

export class DeactivateSessionCommand {
  constructor(
    public readonly userId: string,
    public readonly sessionIdFromToken: string,
    public readonly sessionIdFromQuery: string,
  ) {}
}

@CommandHandler(DeactivateSessionCommand)
export class DeactivateSessionUseCase implements ICommandHandler<DeactivateSessionCommand> {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute(command: DeactivateSessionCommand): Promise<void> {
    const session = await this.sessionsRepository.findById(
      command.sessionIdFromQuery,
    );

    if (!session) {
      DomainExceptions.notFound('session', 'Session not found');
    }
    if (session.userId !== command.sessionIdFromToken) {
      DomainExceptions.forbidden(
        'session',
        'You cannot deactivate another user’s session',
      );
    }

    await this.sessionsRepository.deleteById(session.id, session.userId);
  }
}
