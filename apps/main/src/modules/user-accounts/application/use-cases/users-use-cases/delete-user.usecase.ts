import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  FilesTcpClient,
  getFileIds,
} from '../../../../../core/events/files-tcp.client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';

export class DeleteUserCommand {
  constructor(public readonly userId: number) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserUseCase implements ICommandHandler<DeleteUserCommand> {
  constructor(
    private readonly users: UsersRepository,
    private readonly files: FilesTcpClient,
  ) {}

  async execute({ userId }: DeleteUserCommand): Promise<void> {
    const user = await this.users.findForDeletion(userId);
    if (!user)
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'userId',
        'User not found',
      );

    const fileIds = new Set([
      ...getFileIds(user.avatar),
      ...getFileIds(user.avatarPreview),
      ...user.posts.flatMap((post) => [
        ...getFileIds(post.images),
        ...getFileIds(post.preview),
      ]),
    ]);

    try {
      const result = await this.files.deleteFiles([...fileIds]);
      if (result.error) throw new Error(result.error.code);
    } catch {
      DomainExceptions.serviceUnavailable(
        ErrorStatus.FILES_SERVICE_UNAVAILABLE,
        'files',
        'Could not delete user media',
      );
    }

    await this.users.deleteById(userId);
  }
}
