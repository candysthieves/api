import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostRepository } from '../../../infrastructure/repositories/post-repositories/post.repository.js';
import { CreatePostLocationDto } from '../../../api/dto/create-post.dto.js';
import { MediaStatus, Prisma } from '../../../../../generated/prisma/client.js';
import {
  FilesTcpClient,
  type PostMediaJobAcceptance,
} from '../../../../../core/events/files-tcp.client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

export class CreatePostCommand {
  constructor(
    public readonly description: string,
    public readonly userId: string,
    public readonly files: Express.Multer.File[] = [],
    public readonly locations: CreatePostLocationDto[] = [],
  ) {}
}

@CommandHandler(CreatePostCommand)
export class CreatePostUseCase implements ICommandHandler<CreatePostCommand> {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly filesClient: FilesTcpClient,
  ) {}

  async execute(command: CreatePostCommand): Promise<{ postId: string }> {
    if (!command.files.length) {
      DomainExceptions.validation([
        { field: 'files', message: 'At least one image is required' },
      ]);
    }
    const post = await this.postRepository.createPost({
      description: command.description,
      images: [] as Prisma.InputJsonValue,
      preview: Prisma.JsonNull,
      mediaStatus: MediaStatus.PROCESSING,
      locations: command.locations as unknown as Prisma.InputJsonValue,
      userId: command.userId,
    });
    let result: PostMediaJobAcceptance;
    try {
      result = await this.filesClient.uploadPostFiles(post.id, command.files);
    } catch {
      await this.postRepository.deletePost(post.id);
      DomainExceptions.serviceUnavailable(
        ErrorStatus.FILES_SERVICE_UNAVAILABLE,
        'files',
        'Files service is unavailable',
      );
    }

    if (result.error || !result.data?.accepted) {
      await this.postRepository.deletePost(post.id);
      DomainExceptions.validation(
        result.error?.errors ?? [
          { field: 'files', message: 'Files service rejected media' },
        ],
      );
    }

    return { postId: post.id };
  }
}
