import { Injectable } from '@nestjs/common';
import { MediaStatus, Prisma } from '../../generated/prisma/client.js';
import {
  applyImageEvent,
  type ImageEvent,
  type PostMediaState,
} from '../../../../../libs/contracts/index.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PostImageStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async markDispatched(postId: string, imageId: string): Promise<void> {
    await this.update(postId, (state) => ({
      ...state,
      imageProcessing: state.imageProcessing.map((slot) =>
        slot.imageId === imageId ? { ...slot, dispatchPending: false } : slot,
      ),
    }));
  }

  async markDispatchFailed(
    postId: string,
    imageIds: string[],
    traceId: string,
  ): Promise<void> {
    await this.update(postId, (state) => ({
      ...state,
      imageProcessing: state.imageProcessing.map((slot) =>
        imageIds.includes(slot.imageId) && slot.status === 'QUEUED'
          ? {
              ...slot,
              status: 'FAILED',
              error: { code: 'IMAGE_DISPATCH_FAILED', traceId },
              dispatchPending: false,
            }
          : slot,
      ),
    }));
  }

  async apply(
    event: ImageEvent,
  ): Promise<{ changed: boolean; postId: string }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${event.data.postId}::uuid FOR UPDATE`;
      const post = await tx.post.findUnique({
        where: { id: event.data.postId },
      });
      if (!post) return { changed: false, postId: event.data.postId };
      const state: PostMediaState = {
        images: post.images as PostMediaState['images'],
        preview: post.preview as PostMediaState['preview'],
        imageProcessing: (post as any)
          .imageProcessing as PostMediaState['imageProcessing'],
      };
      if (!state.imageProcessing) return { changed: false, postId: post.id };
      const next = applyImageEvent(state, event);
      if (next === state) return { changed: false, postId: post.id };
      const statuses = next.imageProcessing.map((slot) => slot.status);
      const mediaStatus = statuses.every((status) => status === 'READY')
        ? MediaStatus.READY
        : statuses.some((status) => status === 'READY')
          ? MediaStatus.READY
          : statuses.every((status) => status === 'FAILED')
            ? MediaStatus.FAILED
            : MediaStatus.PROCESSING;
      await tx.post.update({
        where: { id: post.id },
        data: {
          images: next.images as Prisma.InputJsonValue,
          preview: next.preview as Prisma.InputJsonValue,
          imageProcessing: next.imageProcessing as Prisma.InputJsonValue,
          mediaStatus,
        } as any,
      });
      return { changed: true, postId: post.id };
    });
  }

  private async update(
    postId: string,
    transform: (state: PostMediaState) => PostMediaState,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${postId}::uuid FOR UPDATE`;
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post || !(post as any).imageProcessing) return;
      const state = {
        images: post.images,
        preview: post.preview,
        imageProcessing: (post as any).imageProcessing,
      } as PostMediaState;
      const next = transform(state);
      await tx.post.update({
        where: { id: postId },
        data: {
          images: next.images as Prisma.InputJsonValue,
          preview: next.preview as Prisma.InputJsonValue,
          imageProcessing: next.imageProcessing as Prisma.InputJsonValue,
        } as any,
      });
    });
  }
}
