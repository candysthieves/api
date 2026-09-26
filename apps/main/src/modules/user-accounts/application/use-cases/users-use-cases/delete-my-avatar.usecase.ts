import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SseService } from '../../../../../core/sse/sse.service.js';
import { SseEventEnum } from '../../../../../core/sse/types/sse-event.type.js';
import { AvatarFileDeletionsRepository } from '../../../infrastructure/repositories/user-repositories/avatar-file-deletions.repository.js';

export class DeleteMyAvatarCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(DeleteMyAvatarCommand)
export class DeleteMyAvatarUseCase
  implements ICommandHandler<DeleteMyAvatarCommand, void>
{
  constructor(
    private readonly avatarFileDeletions: AvatarFileDeletionsRepository,
    private readonly sse: SseService,
  ) {}

  async execute(command: DeleteMyAvatarCommand): Promise<void> {
    await this.avatarFileDeletions.scheduleCurrentAvatarForDeletion(
      command.userId,
    );
    this.sse.emit(SseEventEnum.AVATAR_UPDATED, { userId: command.userId });
  }
}
