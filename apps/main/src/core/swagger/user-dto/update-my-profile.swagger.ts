import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';
import { UpdateProfileDto } from '../../../modules/user-accounts/api/dto/update-profile.dto.js';

export function ApiUpdateMyProfile() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),

    ApiOperation({
      summary: 'Update current user profile or get profile data',
      description:
        'Updates the profile information of the authenticated user if body is provided, or simply returns current profile data if the body is empty.',
    }),

    ApiBody({
      type: UpdateProfileDto,
      required: false,
      description:
        'Profile update payload. Can be omitted or empty to simply retrieve current profile.',
    }),

    ApiOkResponse({
      description: 'Profile successfully retrieved or updated',
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
      description:
        'Validation failed for input data or username is already taken.',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            enum: [
              ErrorStatus.VALIDATION_ERROR,
              ErrorStatus.USERNAME_ALREADY_EXISTS,
            ],
            example: ErrorStatus.USERNAME_ALREADY_EXISTS,
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'username' },
                message: {
                  type: 'string',
                  example: 'Username already exists',
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
