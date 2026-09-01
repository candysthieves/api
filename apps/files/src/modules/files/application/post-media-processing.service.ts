import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObjectResult } from '../../../core/object-result.js';
import { FilesEventsService } from '../../../events/files-events.service.js';
import {
  EventStatus,
  StoredEventDocument,
} from '../../../events/schemas/event.schema.js';
import { UploadFileContract } from '../api/contracts/upload-file.contract.js';
import { FileMapper } from '../api/mappers/file.mapper.js';
import { FileViewType } from '../api/view-types/file-view.type.js';
import { FileType } from '../schemas/files.schema.js';
import { FilesService } from './files.service.js';
import { S3Adapter } from '../../../core/adapters/s3.adapter.js';

const REQUESTED_EVENT = 'post.media.process.requested';
const SOURCE_BUFFER_MISSING = 'SOURCE_BUFFER_MISSING';
const PROCESSING_FAILED = 'IMAGE_PROCESSING_FAILED';

type AcceptedPostMediaJob = { accepted: true; eventId: string };

@Injectable()
export class PostMediaProcessingService implements OnModuleInit {
  private readonly buffers = new Map<string, UploadFileContract[]>();

  constructor(
    @InjectModel('InputEvent')
    private readonly jobsModel: Model<StoredEventDocument>,
    private readonly files: FilesService,
    private readonly s3: S3Adapter,
    private readonly events: FilesEventsService,
  ) {}

  onModuleInit(): void {
    void this.failInterruptedJobs();
  }

  async accept(
    files: UploadFileContract[],
  ): Promise<ObjectResult<AcceptedPostMediaJob | null>> {
    const postId = files[0].targetId;
    const job = await this.jobsModel.create({
      eventId: crypto.randomUUID(),
      consumer: 'FILES',
      type: REQUESTED_EVENT,
      data: { postId },
      status: EventStatus.UNPROCESSED,
      attempts: 0,
    });

    this.buffers.set(job.eventId, files);
    setImmediate(() => void this.process(job.eventId));

    return ObjectResult.success({ accepted: true, eventId: job.eventId });
  }
  //TODO обсудить с Владом правильный флоу эвентов
  private async process(eventId: string): Promise<void> {
    const job = await this.jobsModel
      .findOneAndUpdate(
        { eventId, type: REQUESTED_EVENT, status: EventStatus.UNPROCESSED },
        { $set: { status: EventStatus.PROCESSING }, $inc: { attempts: 1 } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!job) return;

    const sourceFiles = this.buffers.get(eventId);
    try {
      if (!sourceFiles) {
        await this.fail(
          job,
          SOURCE_BUFFER_MISSING,
          'Source buffers are missing',
        );
        return;
      }

      const images: FileViewType[] = await Promise.all(
        sourceFiles.map(async (file) => {
          const saved = await this.files.saveFile(file, FileType.POST);
          return FileMapper.toFileView(saved, this.s3.getUrl(saved.key));
        }),
      );
      const preview = await this.files.saveFile(
        sourceFiles[0],
        FileType.POST_PREVIEW,
      );
      const media = FileMapper.toFilesResult(
        sourceFiles[0].targetId,
        images,
        FileMapper.toFileView(preview, this.s3.getUrl(preview.key)),
      );

      await this.events.create('post.media.processed', {
        postId: media.targetId,
        images: media.files,
        preview: media.preview,
      });
      await this.jobsModel
        .updateOne(
          { _id: job._id },
          {
            $set: { status: EventStatus.OK, lastError: null, errorCode: null },
          },
        )
        .exec();
    } catch (error) {
      await this.fail(
        job,
        PROCESSING_FAILED,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.buffers.delete(eventId);
    }
  }

  private async fail(
    job: StoredEventDocument,
    code: string,
    message: string,
  ): Promise<void> {
    await this.events.create('post.media.failed', {
      postId: job.data.postId,
      code,
    });
    await this.jobsModel
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
    const interrupted = await this.jobsModel
      .find({
        type: REQUESTED_EVENT,
        status: { $in: [EventStatus.UNPROCESSED, EventStatus.PROCESSING] },
      })
      .exec();

    for (const job of interrupted) {
      await this.fail(job, SOURCE_BUFFER_MISSING, 'Source buffers are missing');
    }
  }
}
