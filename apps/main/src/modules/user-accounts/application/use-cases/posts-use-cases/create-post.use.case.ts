import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsRepository } from '../../../infrastructure/repositories/post-repositories/posts.repository.js';
import { CreatePostLocationDto } from '../../../api/dto/create-post.dto.js';
import { MediaStatus, Prisma } from '../../../../../generated/prisma/client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import {
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_SIZE,
} from '../../../../../../../../libs/contracts/index.js';
import { SseService } from '../../../../../core/sse/sse.service.js';
import { SseEventEnum } from '../../../../../core/sse/types/sse-event.type.js';
import { Logger } from '@nestjs/common';
import { MainRabbitMqProducerService } from '../../../../../core/rabbitmq/main-rabbitmq-producer.service.js';

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
    private readonly rabbitMqProducer: MainRabbitMqProducerService,
    private readonly sse: SseService,
  ) {}

  async execute(command: CreatePostCommand): Promise<{ postId: string }> {
    this.validateFiles(command.files);
    const post = await this.postRepository.createPost({
      description: command.description,
      images: Array(command.files.length).fill(null) as Prisma.InputJsonValue,
      images: [],
      preview: Prisma.JsonNull,
      mediaStatus: MediaStatus.PROCESSING,
      locations: command.locations,
      userId: command.userId,
    });

    this.sse.emit(SseEventEnum.POST_CREATED, { postId: post.id });

    // The HTTP request must not wait for RabbitMQ. If this process stops before
    // publishing finishes, the affected image slots will remain unresolved.
    void this.dispatchImages(post.id, command.files).catch((error: unknown) => {
      this.logger.error(
        `Post image dispatch compensation failed: post ${post.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    });

    return { postId: post.id };
  }

  private async dispatchImages(
    postId: string,
    files: Express.Multer.File[],
  ): Promise<void> {
    try {
      for (const [index, file] of files.entries()) {
        await this.rabbitMqProducer.publishImage({
          postId,
          index,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          body: file.buffer,
        });
      }
    } catch (error) {
      this.logger.error(
        `Post image dispatch failed: post ${postId}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.postRepository.deletePost(postId);
    }
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
