import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { SseService } from '../../sse/sse.service.js';
import { PostsService } from '../../../modules/user-accounts/application/services/posts.service.js';
import { UsersService } from '../../../modules/user-accounts/application/services/users.service.js';
import type {
  AvatarImageEvent,
  ImageEvent,
  PaymentCompletedEvent,
} from '@libs/contracts';
import { EventStoreService } from '../event-store.service.js';

// Применяет результаты обработки файлов и успешных платежей.
@Injectable()
export class InboxService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sseService: SseService,
    private readonly eventStoreService: EventStoreService,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
  ) {}

  async accept(
    event: ImageEvent | AvatarImageEvent | PaymentCompletedEvent,
  ): Promise<void> {
    // Сохраняем событие до подтверждения сообщения в RabbitMQ.
    await this.prismaService.inboxEvent.upsert({
      where: { eventId: event.eventId },
      create: event,
      update: {},
    });
  }

  // Применяет сохранённые результаты по типу события.
  @Cron('* * * * * *', { waitForCompletion: true })
  async processPending(): Promise<void> {
    await this.eventStoreService.run('inboxEvent', async (event) => {
      switch (event.type) {
        case 'payment.completed': {
          const data = event.data as PaymentCompletedEvent['data'];
          await this.usersService.activateBusiness(Number(data.userId));
          this.sseService.emitPaymentCompleted(data.userId);
          break;
        }
        case 'avatar.image.updated':
          await this.applyAvatarEvent(event.data as AvatarImageEvent['data']);
          break;
        case 'post.image.updated':
          await this.applyMediaEvent(event.data as ImageEvent['data']);
          break;
        default:
          throw new Error(`UNKNOWN_EVENT_TYPE:${event.type}`);
      }
    });
  }

  // Обновляет аватар и сообщает об изменении.
  private async applyAvatarEvent(
    data: AvatarImageEvent['data'],
  ): Promise<void> {
    if (
      !(await this.usersService.updateAvatar(
        data.userId,
        data.image,
        data.preview,
      ))
    )
      return;

    this.sseService.emitAvatarUpdated(data.userId);
  }

  // Сохраняет изображение поста и сообщает, когда пост готов.
  private async applyMediaEvent(data: ImageEvent['data']): Promise<void> {
    const isPostReady = await this.postsService.updateImage(
      data.postId,
      data.index,
      data.image,
      data.preview,
    );
    if (!isPostReady) return;

    this.sseService.emitPostMediaUpdated(data.postId);
  }
}
