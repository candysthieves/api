import { Logger } from '@nestjs/common';
import type {
  ImageInputEvent,
  ImageEvent,
} from '../../../../../../libs/contracts/index.js';
import { PostImageWorkerService } from './post-image-worker.service.js';
import type { FilesInboxRepository } from '../../../events/files-inbox.repository.js';
import type { FilesService } from './files.service.js';
import type { S3Adapter } from '../../../core/adapters/s3.adapter.js';
import type { CancelledPostRepository } from './cancelled-post.repository.js';
import type { FilesOutboxRepository } from '../../../events/files-outbox.repository.js';
import { FileType } from '../schemas/files.schema.js';

describe('PostImageWorkerService', () => {
  let logError: jest.SpyInstance;
  const event = {
    postId: 'post',
    index: 0,
    body: Buffer.from([1]),
    size: 1,
  } as ImageInputEvent;
  function setup(state: 'PROCESSING' | 'READY' | 'FAILED' | null = null) {
    const inputEvents = {
      hasFailedEvent: jest.fn().mockResolvedValue(false),
      findEvent: jest.fn().mockResolvedValue(state ? { state } : null),
      createEvent: jest.fn().mockResolvedValue(undefined),
      updateEvent: jest.fn().mockResolvedValue(undefined),
    };
    const files = {
      saveFile: jest
        .fn()
        .mockResolvedValueOnce({
          fileId: 'image',
          key: 'image',
          width: 100,
          height: 200,
        })
        .mockResolvedValue({
          fileId: 'preview',
          key: 'preview',
          width: 100,
          height: 200,
        }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const outbox = {
      updateOrCreate: jest
        .fn<Promise<void>, [ImageEvent]>()
        .mockResolvedValue(undefined),
    };
    const cancelled = {
      isCancelled: jest.fn().mockResolvedValue(false),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    const worker = new PostImageWorkerService(
      inputEvents as unknown as FilesInboxRepository,
      files as unknown as FilesService,
      { getUrl: (key: string) => key } as unknown as S3Adapter,
      cancelled as unknown as CancelledPostRepository,
      outbox as unknown as FilesOutboxRepository,
    );
    return { inputEvents, files, cancelled, outbox, worker };
  }
  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('persists image and preview as READY', async () => {
    const { worker, files, inputEvents, outbox } = setup();
    await worker.processImage(event);
    expect(files.saveFile.mock.calls.map((call: unknown[]) => call[1])).toEqual(
      [FileType.POST, FileType.POST_PREVIEW],
    );
    expect(outbox.updateOrCreate.mock.calls[0][0].data).toEqual({
      postId: 'post',
      index: 0,
      status: 'READY',
      image: { fileId: 'image', url: 'image', width: 100, height: 200 },
      preview: { fileId: 'preview', url: 'preview', width: 100, height: 200 },
    });
    expect(inputEvents.updateEvent).toHaveBeenCalledWith(event, 'READY');
    expect(files.deleteFile).not.toHaveBeenCalled();
  });
  it('saves later images without preview', async () => {
    const { worker, files, outbox } = setup();
    await worker.processImage({ ...event, index: 1 });
    expect(files.saveFile).toHaveBeenCalledTimes(1);
    expect(outbox.updateOrCreate.mock.calls[0][0].data).toMatchObject({
      index: 1,
      status: 'READY',
      preview: null,
    });
  });
  it('skips cancelled posts', async () => {
    const { worker, cancelled, files, outbox } = setup();
    cancelled.isCancelled.mockResolvedValue(true);
    await worker.processImage(event);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate).not.toHaveBeenCalled();
  });
  it('skips remaining images of a post with FAILED in input events', async () => {
    const { worker, inputEvents, outbox, files, cancelled } = setup();
    const events = inputEvents;
    events.hasFailedEvent.mockImplementation((postId: string) =>
      Promise.resolve(postId === event.postId),
    );

    await worker.processImage({ ...event, index: 1 });
    await worker.processImage({ ...event, index: 2 });

    expect(files.saveFile).not.toHaveBeenCalled();
    expect(inputEvents.createEvent).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate).not.toHaveBeenCalled();
    expect(cancelled.cancel).not.toHaveBeenCalled();

    await worker.processImage({ ...event, postId: 'other-post', index: 1 });

    expect(files.saveFile).toHaveBeenCalledTimes(1);
    expect(outbox.updateOrCreate.mock.calls[0][0].data).toMatchObject({
      postId: 'other-post',
      status: 'READY',
    });
  });

  it('does not process images when checking input failures fails', async () => {
    const { worker, inputEvents, outbox, files } = setup();
    const events = inputEvents;
    events.hasFailedEvent.mockRejectedValue(new Error('Database unavailable'));

    await worker.processImage(event);

    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data.status).toBe('FAILED');
  });

  it.each(['READY', 'FAILED'] as const)(
    'ignores completed %s events',
    async (state) => {
      const { worker, files, inputEvents, outbox } = setup(state);
      await worker.processImage(event);
      expect(files.saveFile).not.toHaveBeenCalled();
      expect(outbox.updateOrCreate).not.toHaveBeenCalled();
      expect(inputEvents.createEvent).not.toHaveBeenCalled();
    },
  );
  it('fails interrupted events without processing images again', async () => {
    const { worker, files, inputEvents, cancelled, outbox } =
      setup('PROCESSING');
    inputEvents.createEvent.mockRejectedValue(new Error('Duplicate event'));
    await worker.processImage(event);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data.status).toBe('FAILED');
    expect(inputEvents.updateEvent).toHaveBeenCalledWith(event, 'FAILED');
    expect(cancelled.cancel).not.toHaveBeenCalled();
  });
  it('records FAILED and leaves the image for orphan cleanup when preview fails', async () => {
    const { worker, files, inputEvents, cancelled, outbox } = setup();
    files.saveFile.mockRejectedValueOnce(new Error('Preview failed'));
    await worker.processImage(event);
    expect(files.saveFile).toHaveBeenCalledTimes(2);
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data).toMatchObject({
      status: 'FAILED',
      image: null,
      preview: null,
    });
    expect(inputEvents.updateEvent).toHaveBeenCalledWith(event, 'FAILED');
    expect(cancelled.cancel).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
  });
  it('records FAILED even when checking cancellation fails', async () => {
    const { worker, files, cancelled, outbox } = setup();
    cancelled.isCancelled.mockRejectedValue(new Error('Database unavailable'));
    await worker.processImage(event);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data.status).toBe('FAILED');
  });
  it('records FAILED when reading the event fails', async () => {
    const { worker, files, inputEvents, outbox } = setup();
    inputEvents.findEvent.mockRejectedValue(new Error('Database unavailable'));
    await worker.processImage(event);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data.status).toBe('FAILED');
  });
  it('does not process images when creating the event fails', async () => {
    const { worker, files, inputEvents, outbox } = setup();
    inputEvents.createEvent.mockRejectedValue(
      new Error('Database unavailable'),
    );
    await worker.processImage(event);
    expect(files.saveFile).not.toHaveBeenCalled();
    expect(outbox.updateOrCreate.mock.calls[0][0].data.status).toBe('FAILED');
  });
  it('records FAILED when persisting READY fails and leaves files for orphan cleanup', async () => {
    const { worker, files, outbox } = setup();
    outbox.updateOrCreate.mockRejectedValueOnce(new Error('Write failed'));
    await worker.processImage(event);
    expect(files.saveFile).toHaveBeenCalledTimes(2);
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(
      outbox.updateOrCreate.mock.calls.map(([event]) => event.data.status),
    ).toEqual(['READY', 'FAILED']);
  });
  it('gives FAILED a separate event ID if completing the inbox fails after READY', async () => {
    const { worker, files, inputEvents, outbox } = setup();
    inputEvents.updateEvent.mockRejectedValueOnce(
      new Error('State unavailable'),
    );
    await worker.processImage(event);
    const [ready, failed] = outbox.updateOrCreate.mock.calls.map(
      ([event]) => event,
    );
    expect(failed.data.status).toBe('FAILED');
    expect(failed.eventId).not.toBe(ready.eventId);
    expect(files.deleteFile).not.toHaveBeenCalled();
  });
  it('marks the inbox FAILED when the outbox is unavailable without retrying processing', async () => {
    const { worker, files, inputEvents, cancelled, outbox } = setup();
    outbox.updateOrCreate.mockRejectedValue(new Error('Outbox unavailable'));
    await expect(worker.processImage(event)).resolves.toBeUndefined();
    expect(files.saveFile).toHaveBeenCalledTimes(2);
    expect(files.deleteFile).not.toHaveBeenCalled();
    expect(inputEvents.updateEvent).toHaveBeenCalledWith(event, 'FAILED');
    expect(cancelled.cancel).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
