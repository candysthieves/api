import { Logger } from '@nestjs/common';
import {
  CreatePostCommand,
  CreatePostUseCase,
} from './create-post.use.case.js';
import type { PostsRepository } from '../../../infrastructure/repositories/post-repositories/posts.repository.js';
import type { MainRabbitMqProducerService } from '../../../../../core/rabbitmq/main-rabbitmq-producer.service.js';
import type { SseService } from '../../../../../core/sse/sse.service.js';

jest.mock('../../../../../generated/prisma/client.js', () => ({
  MediaStatus: { PROCESSING: 'PROCESSING' },
  Prisma: { JsonNull: null },
  PrismaClient: class {},
}));
jest.mock(
  '../../../infrastructure/repositories/post-repositories/posts.repository.js',
  () => ({ PostsRepository: class {} }),
);

describe('CreatePostUseCase', () => {
  it('returns before dispatch finishes, then deletes the post on dispatch failure without a deletion notification', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      let exists = false;
      let rejectDispatch!: (error: Error) => void;
      const dispatch = new Promise<void>((_, reject) => {
        rejectDispatch = reject;
      });
      const posts = {
        createPost: jest.fn().mockImplementation(() => {
          exists = true;
          return Promise.resolve({ id: 'post' });
        }),
        deletePost: jest.fn().mockImplementation(() => {
          exists = false;
          return Promise.resolve({ images: [null], preview: null });
        }),
      };
      const sse = { emit: jest.fn() };
      const usecase = new CreatePostUseCase(
        posts as unknown as PostsRepository,
        {
          publishImage: () => dispatch,
        } as unknown as MainRabbitMqProducerService,
        sse as unknown as SseService,
      );
      const file = {
        buffer: Buffer.from([1]),
        size: 1,
        mimetype: 'image/png',
        originalname: 'image.png',
      } as Express.Multer.File;
      await expect(
        usecase.execute(new CreatePostCommand('post', 'user', [file])),
      ).resolves.toEqual({ postId: 'post' });
      expect(exists).toBe(true);
      rejectDispatch(new Error('RabbitMQ down'));
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(exists).toBe(false);
      expect(sse.emit).not.toHaveBeenCalledWith('post-deleted', {
        postId: 'post',
      });
    } finally {
      log.mockRestore();
    }
  });
  it('logs a failed database compensation without an unhandled rejection', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const databaseError = new Error('PostgreSQL unavailable');
      const usecase = new CreatePostUseCase(
        {
          createPost: jest.fn().mockResolvedValue({ id: 'post' }),
          deletePost: jest.fn().mockRejectedValue(databaseError),
        } as unknown as PostsRepository,
        {
          publishImage: jest
            .fn()
            .mockRejectedValue(new Error('Publish failed')),
        } as unknown as MainRabbitMqProducerService,
        { emit: jest.fn() } as unknown as SseService,
      );
      const file = {
        buffer: Buffer.from([1]),
        size: 1,
        mimetype: 'image/png',
        originalname: 'image.png',
      } as Express.Multer.File;
      await expect(
        usecase.execute(new CreatePostCommand('post', 'user', [file])),
      ).resolves.toEqual({ postId: 'post' });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(log).toHaveBeenCalledWith(
        'Post image dispatch compensation failed: post post',
        databaseError.stack,
      );
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
      log.mockRestore();
    }
  });
});
