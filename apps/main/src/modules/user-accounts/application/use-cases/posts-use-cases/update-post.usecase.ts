import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { PostRepository } from '../../../infrastructure/repositories/post-repositories/post.repository.js';

export class UpdatePostCommand {
  constructor(
    public readonly postId: string,
    public readonly userId: string,
    public readonly description: string,
  ) {}
}

@CommandHandler(UpdatePostCommand)
export class UpdatePostUseCase implements ICommandHandler<UpdatePostCommand> {
  constructor(private readonly postsRepository: PostRepository) {}

  async execute(command: UpdatePostCommand): Promise<void> {
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
        'You do not have permission to update this post',
      );
    }

    await this.postsRepository.updateDescription(post.id, command.description);
  }
}
