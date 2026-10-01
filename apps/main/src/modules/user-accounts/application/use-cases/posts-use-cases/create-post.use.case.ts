import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsRepository } from '../../../infrastructure/repositories/post-repositories/posts.repository.js';
import { CreatePostLocationDto } from '../../../api/dto/create-post.dto.js';
import { MediaStatus, Prisma } from '../../../../../generated/prisma/client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { Logger } from '@nestjs/common';
import { ImageOutboxService } from '../../../../../core/events/image-outbox.service.js';
import {
  MAX_POST_IMAGE_SIZE,
  MAX_POST_IMAGES,
} from '../../../../../../../../libs/contracts/index.js';

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
  private readonly logger = new Logger(CreatePostUseCase.name);
  constructor(
    private readonly postRepository: PostsRepository,
    private readonly outbox: ImageOutboxService,
  ) {}

  async execute(command: CreatePostCommand): Promise<{ postId: string }> {
    this.validateFiles(command.files);
    const post = await this.postRepository.createPost({
      description: command.description,
      images: Array.from({ length: command.files.length }, () => null),
      preview: Prisma.JsonNull,
      mediaStatus: MediaStatus.PROCESSING,
      locations: command.locations,
      userId: command.userId,
    });

    try {
      await this.outbox.save(post.id, command.files);
    } catch (error) {
      const results = await Promise.allSettled([
        this.outbox.abort(post.id),
        this.postRepository.deletePost(post.id),
      ]);
      for (const result of results) {
        if (result.status === 'rejected')
          this.logger.error('Post creation compensation failed', result.reason);
      }
      throw error;
    }
    return { postId: post.id };
  }

  private validateFiles(files: Express.Multer.File[]): void {
    if (!files.length) {
      DomainExceptions.validation([
        { field: 'files', message: 'At least one image is required' },
      ]);
    }
    if (files.length > MAX_POST_IMAGES) {
      DomainExceptions.validation([
        { field: 'files', message: 'A post can contain at most 8 images' },
      ]);
    }
    for (const file of files) {
      if (
        file.size < 1 ||
        file.size !== file.buffer.length ||
        file.size > MAX_POST_IMAGE_SIZE ||
        !file.mimetype.startsWith('image/')
      ) {
        DomainExceptions.validation([
          { field: 'files', message: 'Invalid image file' },
        ]);
      }
    }
  }
}
