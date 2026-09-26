import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiUpdateMyAvatar() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Upload or update your avatar asynchronously',
      description:
        'Requires the access token returned by POST /auth/login. In Swagger, click Authorize and enter the accessToken. Accepts a JPEG or PNG image for asynchronous processing. The current user avatar is updated after processing completes.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: { file: { type: 'string', format: 'binary' } },
      },
    }),
    ApiCreatedResponse({
      description: 'Avatar image accepted for processing',
      schema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Identifier of the current user',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        required: ['userId'],
      },
    }),
    ApiBadRequestResponse({
      description:
        'The photo must be less than 10 Mb and have JPEG or PNG format',
    }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
}
