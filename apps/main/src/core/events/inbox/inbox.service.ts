import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { SseService } from '../../sse/sse.service.js';
import { PostsService } from '../../../modules/user-accounts/application/services/posts.service.js';
import { UsersService } from '../../../modules/user-accounts/application/services/users.service.js';
import { AvatarImageEvent, ImageEvent } from '@libs/contracts';
import { EventStoreService } from '../event-store.service.js';

// Сохраняет результаты обработки файлов и обновляет посты и аватары.
@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sse: SseService,
    private readonly events: EventStoreService,
    private readonly posts: PostsService,
    private readonly users: UsersService,
  ) {}

  async accept(event: ImageEvent | AvatarImageEvent): Promise<void> {
    // Сохраняем событие до подтверждения сообщения в RabbitMQ.
    await this.prisma.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: event,
      update: {},
    });
  }

  // Применяет сохранённые результаты по типу события.
  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.events.run('inboxEvent', async (event) => {
      switch (event.type) {
        case 'avatar.image.updated':
          await this.applyAvatarEvent(event.data as AvatarImageEvent['data']);
          break;
        case 'post.image.updated':
          await this.applyMediaEvent(event.data as ImageEvent['data']);
          break;
        default:
          throw new Error(`UNKNOWN_IMAGE_EVENT_TYPE:${event.type}`);
      }
    });
  }

  // Обновляет аватар и сообщает об изменении.
  private async applyAvatarEvent(
    data: AvatarImageEvent['data'],
  ): Promise<void> {
    if (!(await this.users.updateAvatar(data.userId, data.image, data.preview)))
      return;

    this.sse.emitAvatarUpdated(data.userId);
  }

  // Сохраняет изображение поста и сообщает, когда пост готов.
  private async applyMediaEvent(data: ImageEvent['data']): Promise<void> {
    const isPostReady = await this.posts.updateImage(
      data.postId,
      data.index,
      data.image,
      data.preview,
    );
    if (!isPostReady) return;

    this.sse.emitPostMediaUpdated(data.postId);
  }
}
