import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { mongo, Model } from 'mongoose';
import type { Connection } from 'mongoose';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import { ObjectResult } from '../../../core/object-result.js';
import { FilesEventsService } from '../../../events/files-events.service.js';
import {
  EventStatus,
  StoredEventDocument,
} from '../../../events/schemas/event.schema.js';
import { FileMapper } from '../api/mappers/file.mapper.js';
import { FileViewType } from '../api/view-types/file-view.type.js';
import { FileType } from '../schemas/files.schema.js';
import { FilesService } from './files.service.js';
import { UploadFileContract } from '@libs/contracts';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

const REQUESTED_EVENT = 'post.media.process.requested';
const SOURCE_BUFFER_MISSING = 'SOURCE_BUFFER_MISSING';
const PROCESSING_FAILED = 'IMAGE_PROCESSING_FAILED';
const MAX_PROCESSING_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;
const PROCESSING_LEASE_MS = 10 * 60_000;

type AcceptedPostMediaJob = { accepted: true; eventId: string };
type StoredSource = Omit<UploadFileContract, 'buffer'> & { sourceId: string };
type PostMediaJobData = { postId: string; sources?: StoredSource[] };

@Injectable()
export class PostMediaProcessingService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostMediaProcessingService.name);
  private readonly startedAt = new Date();
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    @InjectModel('InputEvent')
    private readonly jobs: Model<StoredEventDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly events: FilesEventsService,
  ) {}

  onModuleInit(): void {
    void this.failInterruptedJobs();
    this.timer = setInterval(() => void this.processPending(), 1_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async accept(
    files: UploadFileContract[],
  ): Promise<ObjectResult<AcceptedPostMediaJob | null>> {
    const validationError = this.validate(files);
    if (validationError) return ObjectResult.failure(validationError);

    const postId = files[0].targetId;
    const eventId = crypto.randomUUID();
    const acceptStartedAt = Date.now();
    const totalSizeBytes = files.reduce((total, file) => total + file.size, 0);
    this.logger.log(
      JSON.stringify({
        event: 'post_media_accept_started',
        postId,
        eventId,
        fileCount: files.length,
        totalSizeBytes,
      }),
    );

    let sources: StoredSource[];
    try {
      sources = await Promise.all(
        files.map((file) => this.storeSource(file, eventId)),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'post_media_accept_failed',
          durationMs: Date.now() - acceptStartedAt,
          postId,
          eventId,
          phase: 'store_sources',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }

    let job: StoredEventDocument;
    const jobCreateStartedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'post_media_job_create_started',
        postId,
        eventId,
      }),
    );
    try {
      job = await this.jobs.create({
        eventId,
        consumer: 'FILES',
        type: REQUESTED_EVENT,
        data: { postId, sources },
        status: EventStatus.UNPROCESSED,
        attempts: 0,
      });
      this.logger.log(
        JSON.stringify({
          event: 'post_media_job_create_completed',
          durationMs: Date.now() - jobCreateStartedAt,
          postId,
          eventId,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'post_media_job_create_failed',
          durationMs: Date.now() - jobCreateStartedAt,
          postId,
          eventId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await this.deleteSources(sources);
      throw error;
    }

    setImmediate(() => void this.processPending());
    this.logger.log(
      JSON.stringify({
        event: 'post_media_accept_completed',
        durationMs: Date.now() - acceptStartedAt,
        postId,
        eventId,
        fileCount: files.length,
        totalSizeBytes,
      }),
    );

    return ObjectResult.success({ accepted: true, eventId: job.eventId });
  }

  private validate(files: UploadFileContract[]) {
    if (!files.length) {
      return {
        code: 'FILES_REQUIRED',
        errors: [{ field: 'files', message: 'At least one image is required' }],
      };
    }

    const postId = files[0].targetId;
    for (const [index, file] of files.entries()) {
      if (
        file.targetId !== postId ||
        !Buffer.isBuffer(file.buffer) ||
        !file.buffer.length ||
        !file.mimeType.startsWith('image/') ||
        file.size !== file.buffer.length ||
        !this.files.validateFileSize(file.buffer.length)
      ) {
        return {
          code: 'INVALID_FILE',
          errors: [{ field: `files[${index}]`, message: 'Invalid image file' }],
        };
      }
    }
  }

  private async processPending(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.requeueStaleProcessingJobs();
      while (true) {
        const job = await this.claimNextJob();
        if (!job) return;
        await this.process(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimNextJob(): Promise<StoredEventDocument | null> {
    return this.jobs
      .findOneAndUpdate(
        {
          type: REQUESTED_EVENT,
          status: EventStatus.UNPROCESSED,
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: new Date() } },
          ],
        },
        { $set: { status: EventStatus.PROCESSING }, $inc: { attempts: 1 } },
        { returnDocument: 'after', sort: { createdAt: 1 } },
      )
      .exec();
  }

  private async process(job: StoredEventDocument): Promise<void> {
    const startedAt = Date.now();
    let releaseSources = false;
    const data = this.getJobData(job);
    this.logger.log(
      JSON.stringify({
        event: 'post_media_job_processing_started',
        jobId: job._id.toString(),
        postId: data.postId,
        attempt: job.attempts,
      }),
    );
    try {
      if (!data.sources?.length) {
        await this.fail(job, SOURCE_BUFFER_MISSING, 'Source files are missing');
        releaseSources = true;
        return;
      }
      const sourceFiles = await Promise.all(
        data.sources.map((source) => this.loadSource(source)),
      );
      this.logger.log(
        JSON.stringify({
          event: 'post_media_sources_loaded',
          durationMs: Date.now() - startedAt,
          jobId: job._id.toString(),
          postId: data.postId,
          sourceCount: sourceFiles.length,
        }),
      );

      const images: FileViewType[] = [];
      for (const [index, file] of sourceFiles.entries()) {
        const saved = await this.files.saveFile(file, FileType.POST);
        images.push(FileMapper.toFileView(saved, this.s3.getUrl(saved.key)));
        this.logger.log(
          JSON.stringify({
            event: 'post_media_image_saved',
            durationMs: Date.now() - startedAt,
            jobId: job._id.toString(),
            postId: data.postId,
            index,
            fileId: saved.fileId,
          }),
        );
      }
      const preview = await this.files.saveFile(
        sourceFiles[0],
        FileType.POST_PREVIEW,
      );
      this.logger.log(
        JSON.stringify({
          event: 'post_media_preview_saved',
          durationMs: Date.now() - startedAt,
          jobId: job._id.toString(),
          postId: data.postId,
          fileId: preview.fileId,
        }),
      );
      const media = FileMapper.toFilesResult(
        sourceFiles[0].targetId,
        images,
        FileMapper.toFileView(preview, this.s3.getUrl(preview.key)),
      );

      const outputEvent = await this.events.create('post.media.processed', {
        postId: media.targetId,
        images: media.files,
        preview: media.preview,
      });
      this.logger.log(
        JSON.stringify({
          event: 'post_media_processed_event_created',
          durationMs: Date.now() - startedAt,
          jobId: job._id.toString(),
          postId: data.postId,
          outputEventId: outputEvent.eventId,
        }),
      );
      await this.jobs
        .updateOne(
          { _id: job._id },
          {
            $set: { status: EventStatus.OK, lastError: null, errorCode: null },
          },
        )
        .exec();
      this.logger.log(
        JSON.stringify({
          event: 'post_media_job_processing_completed',
          durationMs: Date.now() - startedAt,
          jobId: job._id.toString(),
          postId: data.postId,
          outputEventId: outputEvent.eventId,
        }),
      );
      releaseSources = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        JSON.stringify({
          event: 'post_media_job_processing_failed',
          durationMs: Date.now() - startedAt,
          jobId: job._id.toString(),
          postId: data.postId,
          attempt: job.attempts,
          error: message,
        }),
      );
      if (job.attempts < MAX_PROCESSING_ATTEMPTS) {
        await this.jobs
          .updateOne(
            { _id: job._id, status: EventStatus.PROCESSING },
            {
              $set: {
                status: EventStatus.UNPROCESSED,
                lastError: message,
                nextAttemptAt: new Date(Date.now() + RETRY_DELAY_MS),
              },
            },
          )
          .exec();
      } else {
        await this.fail(job, PROCESSING_FAILED, message);
        releaseSources = true;
      }
    } finally {
      if (releaseSources && data.sources?.length) {
        await this.deleteSources(data.sources);
      }
    }
  }

  private async fail(
    job: StoredEventDocument,
    code: string,
    message: string,
  ): Promise<void> {
    await this.events.create('post.media.failed', {
      postId: this.getJobData(job).postId,
      code,
    });
    await this.jobs
      .updateOne(
        { _id: job._id },
        {
          $set: {
            status: EventStatus.ERROR,
            errorCode: code,
            lastError: message,
          },
        },
      )
      .exec();
  }

  private async failInterruptedJobs(): Promise<void> {
    const interrupted = await this.jobs
      .find({
        type: REQUESTED_EVENT,
        status: { $in: [EventStatus.UNPROCESSED, EventStatus.PROCESSING] },
        createdAt: { $lt: this.startedAt },
        'data.sources': { $exists: false },
      })
      .exec();

    for (const job of interrupted) {
      const result = await this.jobs
        .updateOne(
          {
            _id: job._id,
            status: { $in: [EventStatus.UNPROCESSED, EventStatus.PROCESSING] },
          },
          {
            $set: {
              status: EventStatus.ERROR,
              errorCode: SOURCE_BUFFER_MISSING,
              lastError: 'Source buffers are missing',
            },
          },
        )
        .exec();
      if (result.modifiedCount) {
        await this.events.create('post.media.failed', {
          postId: this.getJobData(job).postId,
          code: SOURCE_BUFFER_MISSING,
        });
      }
    }
  }

  private get bucket(): mongo.GridFSBucket {
    return new mongo.GridFSBucket(this.connection.db!, {
      bucketName: 'post_media_sources',
    });
  }

  private getJobData(job: StoredEventDocument): PostMediaJobData {
    return job.data as unknown as PostMediaJobData;
  }

  private async storeSource(
    file: UploadFileContract,
    eventId: string,
  ): Promise<StoredSource> {
    const sourceId = new mongo.ObjectId();
    const storeStartedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'post_media_source_store_started',
        postId: file.targetId,
        eventId,
        sourceId: sourceId.toHexString(),
        sizeBytes: file.size,
      }),
    );
    const stream = this.bucket.openUploadStreamWithId(
      sourceId,
      file.originalName,
      {
        metadata: { contentType: file.mimeType },
      },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        stream.once('error', reject);
        stream.once('finish', resolve);
        stream.end(file.buffer);
      });
      this.logger.log(
        JSON.stringify({
          event: 'post_media_source_store_completed',
          durationMs: Date.now() - storeStartedAt,
          sizeBytes: file.size,
          postId: file.targetId,
          eventId,
          sourceId: sourceId.toHexString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'post_media_source_store_failed',
          durationMs: Date.now() - storeStartedAt,
          sizeBytes: file.size,
          postId: file.targetId,
          eventId,
          sourceId: sourceId.toHexString(),
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
    return {
      sourceId: sourceId.toHexString(),
      targetId: file.targetId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  private async loadSource(source: StoredSource): Promise<UploadFileContract> {
    const chunks: Buffer[] = [];
    for await (const chunk of this.bucket.openDownloadStream(
      new mongo.ObjectId(source.sourceId),
    )) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length !== source.size) {
      throw new Error(`Source file ${source.sourceId} has an invalid size`);
    }
    return { ...source, buffer };
  }

  private async deleteSources(sources: StoredSource[]): Promise<void> {
    await Promise.allSettled(
      sources.map((source) =>
        this.bucket.delete(new mongo.ObjectId(source.sourceId)),
      ),
    );
  }

  private async requeueStaleProcessingJobs(): Promise<void> {
    await this.jobs
      .updateMany(
        {
          type: REQUESTED_EVENT,
          status: EventStatus.PROCESSING,
          updatedAt: { $lt: new Date(Date.now() - PROCESSING_LEASE_MS) },
          'data.sources.0': { $exists: true },
        },
        {
          $set: {
            status: EventStatus.UNPROCESSED,
            nextAttemptAt: null,
            lastError: 'PROCESSING_LEASE_EXPIRED',
          },
        },
      )
      .exec();
  }
}
