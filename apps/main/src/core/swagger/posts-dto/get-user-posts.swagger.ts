import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

export function ApiUserPosts() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get user posts',
      description:
        'Returns posts of a specific user with cursor-based pagination.',
    }),

    ApiParam({
      name: 'userId',
      type: String,
      description: 'ID of the user whose posts are requested.',
      example: '550e8400-e29b-41d4-a716-446655440000',
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
      description: 'User posts successfully retrieved.',
      schema: {
        example: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              description: 'My first post',
              images: [
                {
                  fileId: '550e8400-e29b-41d4-a716-446655440002',
                  url: 'https://example.com/image.webp',
                  width: '1920',
                  height: '1080',
                },
              ],
              preview: {
                fileId: '550e8400-e29b-41d4-a716-446655440002',
                url: 'https://example.com/preview.webp',
                width: '400',
                height: '225',
              },
              createdAt: '2026-09-03T10:30:00.000Z',
            },
          ],
          nextCursor: '2026-09-03T10:20:00.000Z',
          hasNextPage: true,
          isOwner: false,
        },
      },
    }),
  );
}
