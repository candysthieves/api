import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiGetMyAvatar() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Get avatar of current user',
      description:
        'Returns the avatar and avatar preview of the currently authenticated user. If an avatar is not uploaded, avatarUrl and avatarPreviewUrl will be null.',
    }),

    ApiOkResponse({
      description: 'Avatar successfully retrieved',
      schema: {
        type: 'object',
        properties: {
          avatarUrl: {
            nullable: true,
            oneOf: [
              {
                type: 'object',
                required: ['fileId', 'url', 'width', 'height'],
                properties: {
                  fileId: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440001',
                  },
                  url: {
                    type: 'string',
                    example:
                      'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
                  },
                  width: { type: 'number', example: 900 },
                  height: { type: 'number', example: 900 },
                },
              },
              { type: 'null' },
            ],
          },
          avatarPreviewUrl: {
            nullable: true,
            oneOf: [
              {
                type: 'object',
                required: ['fileId', 'url', 'width', 'height'],
                properties: {
                  fileId: {
                    type: 'string',
                    format: 'uuid',
                    example: '550e8400-e29b-41d4-a716-446655440002',
                  },
                  url: {
                    type: 'string',
                    example:
                      'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
                  },
                  width: { type: 'number', example: 900 },
                  height: { type: 'number', example: 900 },
                },
              },
              { type: 'null' },
            ],
          },
        },
        required: ['avatarUrl', 'avatarPreviewUrl'],
        example: {
          avatarUrl: {
            fileId: '550e8400-e29b-41d4-a716-446655440001',
            url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
            width: 900,
            height: 900,
          },
          avatarPreviewUrl: {
            fileId: '550e8400-e29b-41d4-a716-446655440002',
            url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
            width: 900,
            height: 900,
          },
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
}
