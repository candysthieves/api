import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiUpdateMyProfile() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Update current user profile',
      description:
        'Updates the profile information of the authenticated user and returns updated profile data.',
    }),

    ApiOkResponse({
      description: 'Profile successfully updated',
      schema: {
        example: {
          username: 'john_doe',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1995-05-15',
          country: null,
          city: null,
          aboutMe: 'Software developer and open source enthusiast.',
        },
      },
    }),

    ApiBadRequestResponse({
      description: 'Validation failed for input data.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: 50 },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'aboutMe' },
                message: {
                  type: 'string',
                  example:
                    'aboutMe must be shorter than or equal to 200 characters',
                },
              },
            },
          },
        },
      },
    }),

    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
}
