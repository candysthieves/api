import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import type {
  ImageEvent,
  ImageJob,
  MediaFile,
} from '../../../../../../libs/contracts/index.js';
import {
  PostImageJob,
  type PostImageJobDocument,
} from '../schemas/post-image-job.schema.js';

@Injectable()
export class PostImageJobRepository {
  constructor(
    @InjectModel(PostImageJob.name)
    private readonly jobs: Model<PostImageJobDocument>,
  ) {}

  async begin(job: ImageJob) {
    const current = await this.jobs
      .findOneAndUpdate(
        { imageId: job.imageId },
        {
          $setOnInsert: {
            imageId: job.imageId,
            postId: job.postId,
            index: job.index,
            total: job.total,
            fileId: randomUUID(),
            previewFileId: randomUUID(),
          },
        },
        { upsert: true, new: true },
      )
      .exec();
    if (
      current.postId !== job.postId ||
      current.index !== job.index ||
      current.total !== job.total
    )
      throw new Error('IMAGE_JOB_MISMATCH');
    if (current.state === 'READY' || current.state === 'FAILED')
      return {
        terminal: true,
        attempts: current.attempts,
        fileId: current.fileId,
        previewFileId: current.previewFileId,
        retryAt: current.retryAt,
      };
    if (current.state === 'QUEUED' && current.retryAt > Date.now())
      return {
        terminal: false,
        attempts: current.attempts,
        fileId: current.fileId,
        previewFileId: current.previewFileId,
        retryAt: current.retryAt,
      };
    const next = await this.jobs
      .findOneAndUpdate(
        { imageId: job.imageId, state: { $ne: 'PROCESSING' } },
        { $set: { state: 'PROCESSING' }, $inc: { attempts: 1, revision: 1 } },
        { new: true },
      )
      .exec();
    const item = next ?? current;
    return {
      terminal: false,
      attempts: item.attempts,
      fileId: item.fileId,
      previewFileId: item.previewFileId,
      retryAt: item.retryAt,
    };
  }

  async finish(
    job: ImageJob,
    image: MediaFile,
    preview: MediaFile | null,
  ): Promise<void> {
    const current = await this.jobs.findOne({ imageId: job.imageId }).exec();
    if (!current || current.state !== 'PROCESSING') return;
    const revision = current.revision + 1;
    const event: ImageEvent = {
      eventId: randomUUID(),
      consumer: 'MAIN',
      type: 'post.image.updated.v1',
      data: {
        postId: job.postId,
        imageId: job.imageId,
        index: job.index,
        revision,
        status: 'READY',
        attempts: current.attempts,
        error: null,
        image,
        preview,
      },
    };
    await this.jobs
      .updateOne(
        {
          imageId: job.imageId,
          state: 'PROCESSING',
          revision: current.revision,
        },
        {
          $set: {
            state: 'READY',
            image,
            preview,
            pendingEvent: event,
            retryAt: 0,
          },
          $inc: { revision: 1 },
        },
      )
      .exec();
  }

  async failAttempt(job: ImageJob, error: Error): Promise<'DONE' | 'RETRY'> {
    const current = await this.jobs.findOne({ imageId: job.imageId }).exec();
    if (!current || current.state !== 'PROCESSING') return 'DONE';
    if (current.attempts < 3) {
      await this.jobs
        .updateOne(
          { _id: current._id },
          { $set: { state: 'QUEUED', retryAt: Date.now() + 10_000 } },
        )
        .exec();
      return 'RETRY';
    }
    const revision = current.revision + 1;
    const failure = { code: 'IMAGE_PROCESSING_FAILED', traceId: job.imageId };
    const event: ImageEvent = {
      eventId: randomUUID(),
      consumer: 'MAIN',
      type: 'post.image.updated.v1',
      data: {
        postId: job.postId,
        imageId: job.imageId,
        index: job.index,
        revision,
        status: 'FAILED',
        attempts: current.attempts,
        error: failure,
        image: null,
        preview: null,
      },
    };
    await this.jobs
      .updateOne(
        { _id: current._id },
        {
          $set: {
            state: 'FAILED',
            error: failure,
            pendingEvent: event,
            retryAt: 0,
          },
        },
      )
      .exec();
    return 'DONE';
  }

  async get(imageId: string): Promise<PostImageJobDocument | null> {
    return this.jobs.findOne({ imageId }).exec();
  }
  async pending(limit: number): Promise<PostImageJobDocument[]> {
    return this.jobs
      .find({ pendingEvent: { $ne: null } })
      .limit(limit)
      .exec();
  }
  async clearPending(imageId: string, eventId: string): Promise<void> {
    await this.jobs
      .updateOne(
        { imageId, 'pendingEvent.eventId': eventId },
        { $set: { pendingEvent: null } },
      )
      .exec();
  }
}
