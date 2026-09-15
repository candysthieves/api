import { validateImageEvent, type ImageEvent } from './post-image.contract.js';

describe('Image result validation', () => {
  const event = (): ImageEvent => ({
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    consumer: 'MAIN',
    type: 'post.image.updated.v1',
    data: {
      postId: '550e8400-e29b-41d4-a716-446655440001',
      index: 0,
      status: 'READY',
      image: {
        fileId: 'image',
        url: 'https://example.com/image',
        width: 100,
        height: 100,
      },
      preview: {
        fileId: 'preview',
        url: 'https://example.com/preview',
        width: 50,
        height: 50,
      },
    },
  });

  it('accepts a ready image with its preview', () => {
    expect(() => validateImageEvent(event())).not.toThrow();
  });

  it('accepts terminal failure without media', () => {
    const value = event();
    Object.assign(value.data, {
      status: 'FAILED',
      image: null,
      preview: null,
    });
    expect(() => validateImageEvent(value)).not.toThrow();
  });

  it.each([
    null,
    [],
    {},
    { ...event(), consumer: 'FILES' },
    { ...event(), eventId: 'invalid' },
  ])('rejects malformed envelopes: %j', (value) => {
    expect(() => validateImageEvent(value)).toThrow();
  });

  it.each([
    { status: 'UNKNOWN' },
    { status: ['QUEUED'], image: null, preview: null },
    { index: -1 },
    { index: 8 },
    { preview: null },
    { image: { fileId: 'image', url: 'url', width: 'NaN', height: 100 } },
  ])('rejects invalid image state: %j', (data) => {
    const value = event();
    expect(() =>
      validateImageEvent({ ...value, data: { ...value.data, ...data } }),
    ).toThrow();
  });
  it.each(['100', NaN, Infinity, -Infinity, 0, -1])(
    'rejects nonnumeric, nonfinite or nonpositive dimensions: %s',
    (dimension) => {
      for (const field of ['width', 'height']) {
        for (const media of ['image', 'preview'] as const) {
          const value = event();
          Object.assign(value.data[media]!, { [field]: dimension });
          expect(() => validateImageEvent(value)).toThrow(
            'INVALID_READY_EVENT',
          );
        }
      }
    },
  );
});
