import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CancelledPost,
  type CancelledPostDocument,
} from '../schemas/cancelled-post.schema.js';

const CANCELLATION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CancelledPostRepository {
  constructor(
    @InjectModel(CancelledPost.name)
    private readonly cancelledPosts: Model<CancelledPostDocument>,
  ) {}

  async cancel(postId: string): Promise<void> {
    const now = new Date();
    await this.cancelledPosts
      .updateOne(
        { postId },
        {
          $set: {
            expiresAt: new Date(now.getTime() + CANCELLATION_TTL_MS),
          },
          $setOnInsert: { postId },
        },
        { upsert: true },
      )
      .exec();
  }

  async isCancelled(postId: string): Promise<boolean> {
    return Boolean(
      await this.cancelledPosts
        .exists({ postId, expiresAt: { $gt: new Date() } })
        .exec(),
    );
  }
}
