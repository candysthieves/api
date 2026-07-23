import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SessionsRepository } from '../../../repositories/sessionRepositories/sessions.repository.js';

export class DeactivateSessionCommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly deviceId: string,
  ) {}
}

@CommandHandler(DeactivateSessionCommand)
export class DeactivateSessionUseCase implements ICommandHandler<DeactivateSessionCommand> {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async execute({ userId, deviceId }: DeactivateSessionCommand): Promise<void> {
    const session = await this.sessionsRepository.findById(deviceId);

    if (!session || session.userId !== userId) {
      throw new NotFoundException();
    }

    await this.sessionsRepository.deleteById(session.id);
  }
}
