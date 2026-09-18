import { Logger } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { ImageResultInboxService } from './image-result-inbox.service.js';
import type { PostImagesRepository } from './post-images.repository.js';
import type { SseService } from '../sse/sse.service.js';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

jest.mock('./post-images.repository.js', () => ({
  PostImagesRepository: class {},
}));

jest.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: class {},
  MediaStatus: { READY: 'READY' },
  EventStatus: {
    UNPROCESSED: 'UNPROCESSED',
    PROCESSING: 'PROCESSING',
    OK: 'OK',
    ERROR: 'ERROR',
  },
}));

describe('ImageResultInboxService scheduler', () => {
  const event = {
    eventId: 'event',
    consumer: 'MAIN' as const,
    type: 'post.image.updated.v1' as const,
    data: {
      postId: 'post',
      index: 0,
      status: 'READY' as const,
      image: { fileId: 'image', url: 'url', width: 100, height: 100 },
      preview: { fileId: 'preview', url: 'url', width: 50, height: 50 },
    },
  };
  async function setup() {
    const row = {
      id: 'inbox',
      ...event,
      data: { ...event.data },
      status: 'UNPROCESSED',
      attempts: 0,
      updatedAt: new Date(),
    };
    const database = {
      upsert: jest.fn().mockResolvedValue(row),
      findMany: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            row.status === 'UNPROCESSED' &&
              (row.attempts === 0 ||
                row.updatedAt.getTime() <= Date.now() - 10_000)
              ? [{ ...row }]
              : [],
          ),
        ),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            status: string;
            updatedAt?: Date;
            attempts?: { increment: number };
          };
        }) => {
          if (where.id !== row.id)
            return Promise.reject(new Error('Event not found'));
          const { attempts, ...changes } = data;
          Object.assign(row, changes);
          row.updatedAt = data.updatedAt ?? new Date();
          if (attempts) row.attempts += attempts.increment;
          return Promise.resolve({ ...row });
        },
      ),
    };
    const images = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'post', images: [null], preview: null }),
      updateImage: jest.fn().mockResolvedValue(undefined),
      updatePreview: jest.fn().mockResolvedValue(undefined),
      deletePost: jest
        .fn()
        .mockRejectedValue(new Error('PostgreSQL unavailable')),
    };
    const sse = { emit: jest.fn() };
    const service = new ImageResultInboxService(
      {
        inboxEvent: database,
      } as unknown as PrismaService,
      sse as unknown as SseService,
      images as unknown as PostImagesRepository,
    );
    const module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [{ provide: ImageResultInboxService, useValue: service }],
    }).compile();
    return { service, database, images, sse, row, module };
  }
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-09T00:00:00.000Z'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('accepts only into inbox; applies and completes on schedule, without repeating a completed event', async () => {
    const { service, database, images, sse, row, module } = await setup();
    await module.init();
    try {
      await service.accept(event);
      await jest.advanceTimersByTimeAsync(999);
      expect(images.updateImage).not.toHaveBeenCalled();
      expect(sse.emit).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      expect(row.status).toBe('OK');
      expect(row.attempts).toBe(0);
      expect(sse.emit).toHaveBeenCalledWith('post-media-updated', {
        postId: 'post',
      });
      await service.accept(event);
      expect(database.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({ update: {} }),
      );
      await jest.advanceTimersByTimeAsync(1000);
      expect(images.updateImage).toHaveBeenCalledTimes(1);
      expect(sse.emit).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
    await jest.advanceTimersByTimeAsync(1000);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('keeps a failed PostgreSQL deletion retryable and waits ten seconds', async () => {
    const { images, row, module } = await setup();
    Object.assign(row.data, { status: 'FAILED', image: null, preview: null });
    await module.init();
    try {
      await jest.advanceTimersByTimeAsync(1000);
      expect(images.deletePost).toHaveBeenCalledTimes(1);
      expect(row.status).toBe('UNPROCESSED');
      expect(row.attempts).toBe(1);
      expect(row.updatedAt).toEqual(new Date());
      await jest.advanceTimersByTimeAsync(9000);
      expect(images.deletePost).toHaveBeenCalledTimes(1);
      images.deletePost.mockResolvedValue(null);
      await jest.advanceTimersByTimeAsync(1000);
      expect(images.deletePost).toHaveBeenCalledTimes(2);
      expect(row.status).toBe('OK');
      expect(row.attempts).toBe(1);
    } finally {
      await module.close();
    }
  });
  it('marks the third failed attempt ERROR and stops retrying', async () => {
    const { images, row, module } = await setup();
    images.updateImage.mockRejectedValue(new Error('PostgreSQL unavailable'));
    await module.init();
    try {
      await jest.advanceTimersByTimeAsync(1000);
      expect(row.attempts).toBe(1);
      expect(row.status).toBe('UNPROCESSED');
      await jest.advanceTimersByTimeAsync(10_000);
      expect(row.attempts).toBe(2);
      expect(row.status).toBe('UNPROCESSED');
      await jest.advanceTimersByTimeAsync(10_000);
      expect(row.attempts).toBe(3);
      expect(row.status).toBe('ERROR');
      await jest.advanceTimersByTimeAsync(60_000);
      expect(images.updateImage).toHaveBeenCalledTimes(3);
    } finally {
      await module.close();
    }
  });
  it.each([0, 1])('replaces an existing image at index %s', async (index) => {
    const { images, sse, row, module } = await setup();
    const oldImage = { ...event.data.image, url: 'old-url' };
    const oldPreview = { ...event.data.preview, url: 'old-preview' };
    const post = {
      id: 'post',
      images: [oldImage, oldImage],
      preview: oldPreview,
    };
    row.data.index = index;
    if (index !== 0) Object.assign(row.data, { preview: null });
    images.findById.mockResolvedValue(post);
    await module.init();
    try {
      await jest.advanceTimersByTimeAsync(1000);
      expect(row.status).toBe('OK');
      expect(images.updateImage).toHaveBeenCalledWith(
        'post',
        index,
        event.data.image,
        'READY',
      );
      expect(images.findById).not.toHaveBeenCalled();
      if (index === 0) {
        expect(images.updatePreview).toHaveBeenCalledWith(
          'post',
          event.data.preview,
        );
      } else {
        expect(images.updatePreview).not.toHaveBeenCalled();
      }
      expect(sse.emit).toHaveBeenCalledWith('post-media-updated', {
        postId: 'post',
      });
    } finally {
      await module.close();
    }
  });
  it('retries a preview update failure before completing the event', async () => {
    const { images, sse, row, module } = await setup();
    images.updatePreview.mockRejectedValueOnce(new Error('Write failed'));
    await module.init();
    try {
      await jest.advanceTimersByTimeAsync(1000);
      expect(row.status).toBe('UNPROCESSED');
      expect(row.attempts).toBe(1);
      expect(sse.emit).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(10_000);
      expect(row.status).toBe('OK');
      expect(images.updatePreview).toHaveBeenCalledTimes(2);
      expect(sse.emit).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
  });
  it('does not overlap passes while applying a result', async () => {
    const { images, row, module } = await setup();
    let finish!: (result: object) => void;
    images.updateImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await module.init();
    try {
      await jest.advanceTimersByTimeAsync(5000);
      expect(images.updateImage).toHaveBeenCalledTimes(1);
      expect(row.status).toBe('PROCESSING');
      finish({ changed: false, postId: 'post' });
      await jest.advanceTimersByTimeAsync(0);
      expect(row.status).toBe('OK');
    } finally {
      await module.close();
    }
  });
});
