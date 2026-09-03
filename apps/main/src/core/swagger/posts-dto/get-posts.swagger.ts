import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';

export function ApiGetPosts() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get posts',
      description: 'Returns posts with cursor-based pagination.',
    }),

    ApiQuery({
      name: 'cursor',
      required: false,
      type: String,
      description: 'Cursor for fetching the next page of posts.',
      example: '2026-09-03T10:30:00.000Z',
    }),

    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of posts to return.',
      example: 10,
      default: 10,
      minimum: 1,
      maximum: 20,
    }),

    ApiOkResponse({
      description: 'Posts successfully retrieved.',
      schema: {
        example: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              description: 'My first post',
              images: [
                {
                  fileId: '550e8400-e29b-41d4-a716-446655440001',
                  url: 'https://example.com/image.webp',
                  width: '1920',
                  height: '1080',
                },
              ],
              preview: {
                fileId: '550e8400-e29b-41d4-a716-446655440001',
                url: 'https://example.com/preview.webp',
                width: '400',
                height: '225',
              },
              createdAt: '2026-09-03T10:30:00.000Z',
            },
          ],
          nextCursor: '2026-09-03T10:20:00.000Z',
          hasNextPage: true,
        },
      },
    }),
  );
}
