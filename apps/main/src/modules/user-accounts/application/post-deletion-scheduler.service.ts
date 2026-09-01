import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { FilesTcpClient } from '../../../core/events/files-tcp.client.js';
import { PostRepository } from '../infrastructure/repositories/post-repositories/post.repository.js';

@Injectable()
export class PostDeletionSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostDeletionSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly postsRepository: PostRepository,
    private readonly filesClient: FilesTcpClient,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processDuePosts(), 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDuePosts(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const posts = await this.postsRepository.findPostsDueForDeletion(
        new Date(),
      );

      for (const post of posts) {
        try {
          const result = await this.filesClient.deletePostMedia(
            post.images,
            post.preview,
          );

          if (result.error) {
            throw new Error(result.error.code);
          }

          await this.postsRepository.deletePost(post.id);
        } catch (error) {
          this.logger.error(
            `Could not delete media for post ${post.id}; it will be retried.`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Could not process posts scheduled for deletion.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.processing = false;
    }
  }
}
