import { Injectable } from '@nestjs/common';
import { PostImageTransport } from '../../../../../libs/rabbitmq/post-image-transport.js';
import { PostImagesRepository } from './post-images.repository.js';

@Injectable()
export class PostImageDispatchService {
  constructor(
    private readonly transport: PostImageTransport,
    private readonly state: PostImagesRepository,
  ) {}

  async dispatch(
    postId: string,
    imageIds: string[],
    files: Express.Multer.File[],
  ): Promise<void> {
    const deadline = Date.now() + 15_000;
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        await this.transport.publishJob(
          {
            version: 1,
            postId,
            imageId: imageIds[index],
            index,
            total: files.length,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            attempt: 1,
            notBefore: 0,
            body: file.buffer,
          },
          deadline,
        );
        await this.state.markDispatched(postId, imageIds[index]);
      } catch (error) {
        throw new PostImageDispatchError(postId, imageIds[index], index, error);
      }
    }
  }
}

export class PostImageDispatchError extends Error {
  constructor(
    readonly postId: string,
    readonly imageId: string,
    readonly index: number,
    readonly cause: unknown,
  ) {
    super('POST_IMAGE_DISPATCH_FAILED');
  }
}
