export const MAX_POST_IMAGES = 8;
export const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;

export type MediaFile = {
  fileId: string;
  url: string;
  width: number;
  height: number;
};

export type ImageInputEvent = {
  eventId: string;
  postId: string;
  index: number;
  originalName: string;
  mimeType: string;
  size: number;
  body: Buffer;
};

export type ImageEvent = {
  eventId: string;
  consumer: 'MAIN';
  type: 'post.image.updated.v1';
  data: {
    postId: string;
    index: number;
    status: 'READY';
    image: MediaFile;
    preview: MediaFile | null;
  };
};

export function validateImageEvent(
  event: unknown,
): asserts event is ImageEvent {
  if (
    !isRecord(event) ||
    !isUuid(event.eventId) ||
    event.consumer !== 'MAIN' ||
    event.type !== 'post.image.updated.v1' ||
    !isRecord(event.data)
  )
    throw new Error('INVALID_IMAGE_EVENT');
  const data = event.data;
  if (
    !isUuid(data.postId) ||
    !isIntegerInRange(data.index, 0, MAX_POST_IMAGES - 1) ||
    data.status !== 'READY'
  )
    throw new Error('INVALID_IMAGE_STATE');
  if (
    !isMediaFile(data.image) ||
    (data.index === 0 ? !isMediaFile(data.preview) : data.preview !== null)
  )
    throw new Error('INVALID_READY_EVENT');
}

function isMediaFile(value: unknown): value is MediaFile {
  return (
    isRecord(value) &&
    typeof value.fileId === 'string' &&
    !!value.fileId &&
    typeof value.url === 'string' &&
    !!value.url &&
    typeof value.width === 'number' &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
