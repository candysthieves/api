import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsRepository } from '../../../infrastructure/repositories/post-repositories/posts.repository.js';
import { CreatePostLocationDto } from '../../../api/dto/create-post.dto.js';
import { MediaStatus, Prisma } from '../../../../../generated/prisma/client.js';
import {
  FilesTcpClient,
  type PostMediaJobAcceptance,
} from '../../../../../core/events/files-tcp.client.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { Logger } from '@nestjs/common';

export class CreatePostCommand {
  constructor(
    public readonly description: string,
    public readonly userId: string,
    public readonly files: Express.Multer.File[] = [],
    public readonly locations: CreatePostLocationDto[] = [],
    public readonly traceId = '',
  ) {}
}

@CommandHandler(CreatePostCommand)
export class CreatePostUseCase implements ICommandHandler<CreatePostCommand> {
  private readonly logger = new Logger(CreatePostUseCase.name);

  constructor(
    private readonly postRepository: PostsRepository,
    private readonly filesClient: FilesTcpClient,
  ) {}

  async execute(command: CreatePostCommand): Promise<{ postId: string }> {
    const startedAt = performance.now();
    const totalSizeBytes = command.files.reduce((total, file) => total + file.size, 0);
    this.logger.log(JSON.stringify({ event: 'post_create_started', traceId: command.traceId, fileCount: command.files.length, totalSizeBytes }));
    if (!command.files.length) {
      DomainExceptions.validation([
        { field: 'files', message: 'At least one image is required' },
      ]);
    }
    const databaseCreateStartedAt = performance.now();
    const post = await this.postRepository.createPost({
      description: command.description,
      images: [] as Prisma.InputJsonValue,
      preview: Prisma.JsonNull,
      mediaStatus: MediaStatus.PROCESSING,
      locations: command.locations as unknown as Prisma.InputJsonValue,
      userId: command.userId,
    });
    this.logger.log(JSON.stringify({ event: 'post_create_database_completed', traceId: command.traceId, postId: post.id, durationMs: elapsedMs(databaseCreateStartedAt) }));
    let result: PostMediaJobAcceptance;
    try {
      result = await this.filesClient.uploadPostFiles(post.id, command.files, command.traceId);
    } catch (error) {
      const transportError = getErrorDetails(error);
      this.logger.error(
        JSON.stringify({
          event: 'files_upload_transport_failed',
          traceId: command.traceId,
          postId: post.id,
          error: transportError,
        }),
        transportError.stack,
      );
      await this.postRepository.deletePost(post.id);
      DomainExceptions.serviceUnavailable(
        ErrorStatus.FILES_SERVICE_UNAVAILABLE,
        'files',
        'Files service is unavailable',
      );
    }

    if (result.error || !result.data?.accepted) {
      this.logger.warn(
        JSON.stringify({
          event: 'files_upload_rejected',
          traceId: command.traceId,
          postId: post.id,
          error: result.error,
          data: result.data,
        }),
      );
      await this.postRepository.deletePost(post.id);
      DomainExceptions.validation(
        result.error?.errors ?? [
          { field: 'files', message: 'Error from files service' },
        ],
      );
    }

    this.logger.log(JSON.stringify({ event: 'post_create_completed', traceId: command.traceId, postId: post.id, durationMs: elapsedMs(startedAt) }));
    return { postId: post.id };
  }
}

function elapsedMs(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(3));
}

function getErrorDetails(error: unknown): {
  name: string;
  code?: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    const code =
      'code' in error && typeof error.code === 'string'
        ? error.code
        : undefined;
    return { name: error.name, code, message: error.message, stack: error.stack };
  }

  return { name: 'UnknownError', message: String(error) };
}
