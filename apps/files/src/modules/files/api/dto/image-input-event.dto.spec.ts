import { validateSync } from 'class-validator';
import { ImageInputEventDto } from './image-input-event.dto.js';
import { MAX_POST_IMAGE_SIZE } from '../../../../../../../libs/contracts/index.js';

describe('ImageInputEventDto', () => {
  function event(overrides: Record<string, unknown> = {}): ImageInputEventDto {
    return Object.assign(
      new ImageInputEventDto(),
      {
        postId: '550e8400-e29b-41d4-a716-446655440000',
        index: 0,
        originalName: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 1,
        body: Buffer.from([1]),
      },
      overrides,
    );
  }

  it('accepts valid metadata and the original binary body', () => {
    const body = Buffer.from([1, 2]);
    const value = event({ body, size: 2 });
    expect(validateSync(value)).toEqual([]);
    expect(value.body).toBe(body);
  });

  it('accepts the maximum index, byte length and image size', () => {
    expect(
      validateSync(
        event({
          index: 7,
          originalName: 'я'.repeat(127) + 'a',
          body: Buffer.alloc(MAX_POST_IMAGE_SIZE),
          size: MAX_POST_IMAGE_SIZE,
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    ['postId', 'invalid'],
    ['index', -1],
    ['index', 8],
    ['index', 0.5],
    ['index', '0'],
    ['originalName', 123],
    ['originalName', 'я'.repeat(128)],
    ['mimeType', 'text/plain'],
    ['mimeType', 'image/'],
    ['size', '1'],
    ['size', 0],
    ['size', 1.5],
    ['size', Infinity],
    ['size', MAX_POST_IMAGE_SIZE + 1],
    ['body', [1]],
    ['body', { type: 'Buffer', data: [1] }],
    ['body', Buffer.alloc(0)],
    ['body', Buffer.from([1, 2])],
  ])('rejects invalid %s (%p)', (field, value) => {
    expect(validateSync(event({ [field]: value })).length).toBeGreaterThan(0);
  });

  it.each(['postId', 'index', 'originalName', 'mimeType', 'size', 'body'])(
    'requires %s',
    (field) => {
      expect(
        validateSync(event({ [field]: undefined })).length,
      ).toBeGreaterThan(0);
      expect(validateSync(event({ [field]: null })).length).toBeGreaterThan(0);
    },
  );

  it('rejects an oversized body even when its declared size matches', () => {
    const body = Buffer.alloc(MAX_POST_IMAGE_SIZE + 1);
    expect(
      validateSync(event({ body, size: body.length })).length,
    ).toBeGreaterThan(0);
  });
});
