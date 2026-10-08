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
import { UpdateProfileDto } from '../../../modules/user-accounts/api/dto/users/update-profile.dto.js';

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
        type: 'object',
        required: [
          'username',
          'firstName',
          'lastName',
          'dateOfBirth',
          'country',
          'city',
          'aboutMe',
        ],
        properties: {
          username: {
            type: 'string',
            example: 'john_doe',
          },
          firstName: {
            type: 'string',
            nullable: true,
            example: 'John',
          },
          lastName: {
            type: 'string',
            nullable: true,
            example: 'Doe',
          },
          dateOfBirth: {
            type: 'string',
            nullable: true,
            example: '1995-05-15',
          },
          country: {
            nullable: true,
            type: 'object',
            required: ['countryId', 'countryNameRu', 'countryNameEn'],
            properties: {
              countryId: {
                type: 'integer',
                description: 'Unique identifier of the country',
                example: 3,
              },
              countryNameRu: {
                type: 'string',
                description: 'Country name in Russian',
                example: 'Беларусь',
              },
              countryNameEn: {
                type: 'string',
                description: 'Country name in English',
                example: 'Belarus',
              },
            },
          },
          city: {
            nullable: true,
            type: 'object',
            required: ['cityId', 'countryId', 'cityNameRu', 'cityNameEn'],
            properties: {
              cityId: {
                type: 'integer',
                description: 'Unique identifier of the city',
                example: 625144,
              },
              countryId: {
                type: 'integer',
                description: 'Identifier of the country this city belongs to',
                example: 3,
              },
              cityNameRu: {
                type: 'string',
                description: 'City name in Russian',
                example: 'Минск',
              },
              cityNameEn: {
                type: 'string',
                description: 'City name in English',
                example: 'Minsk',
              },
            },
          },
          aboutMe: {
            type: 'string',
            nullable: true,
            example: 'Software developer and open source enthusiast.',
          },
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
