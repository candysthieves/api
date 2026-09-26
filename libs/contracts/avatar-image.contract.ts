import type { MediaFile } from './post-image.contract.js';

export const MAX_AVATAR_IMAGE_SIZE = 10 * 1024 * 1024;
export type AvatarImageInputEvent = {
  eventId: string;
  userId: string;
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png';
  size: number;
  body: Buffer;
};
export type AvatarImageEvent = {
  eventId: string;
  consumer: 'MAIN';
  type: 'avatar.image.updated.v1';
  data: { userId: string; image: MediaFile; preview: MediaFile };
};

export function validateAvatarImageEvent(
  value: unknown,
): asserts value is AvatarImageEvent {
  if (
    !record(value) ||
    !uuid(value.eventId) ||
    value.consumer !== 'MAIN' ||
    value.type !== 'avatar.image.updated.v1' ||
    !record(value.data) ||
    !uuid(value.data.userId) ||
    !media(value.data.image) ||
    !media(value.data.preview)
  )
    throw new Error('INVALID_AVATAR_IMAGE_EVENT');
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function uuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
function media(value: unknown): value is MediaFile {
  return (
    record(value) &&
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
