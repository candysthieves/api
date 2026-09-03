import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { PostRepository } from '../../../infrastructure/repositories/post-repositories/post.repository.js';

export class HardDeletePostCommand {
  constructor(
    public readonly postId: string,
    public readonly userId: string,
  ) {}
}

@CommandHandler(HardDeletePostCommand)
export class HardDeletePostUseCase implements ICommandHandler<HardDeletePostCommand> {
  constructor(private readonly postsRepository: PostRepository) {}

  async execute(command: HardDeletePostCommand): Promise<void> {
    const post = await this.postsRepository.findById(command.postId);

    if (!post) {
      DomainExceptions.notFound(
        ErrorStatus.POST_NOT_FOUND,
        'postId',
        'Post not found',
      );
    }

    if (post.userId !== command.userId) {
      DomainExceptions.forbidden(
        ErrorStatus.POST_ACCESS_FORBIDDEN,
        'postId',
        'You do not have permission to delete this post',
      );
    }

    await this.postsRepository.markForDeletion(post.id, new Date());
  }
}
