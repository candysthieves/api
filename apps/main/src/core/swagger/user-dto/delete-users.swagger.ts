import { applyDecorators } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiDeleteUser() {
  return applyDecorators(
    ApiBasicAuth('adminBasic'),
    ApiOperation({ summary: 'Delete a user and all related data' }),
    ApiParam({ name: 'userId', type: Number, example: 42 }),
    ApiNoContentResponse({ description: 'User and related data deleted' }),
    ApiNotFoundResponse({ description: 'User not found' }),
    ApiUnauthorizedResponse({
      description: 'Administrator credentials required',
    }),
  );
}

export function ApiDeleteAllUsers() {
  return applyDecorators(
    ApiBasicAuth('adminBasic'),
    ApiOperation({ summary: 'Delete all users and all related data' }),
    ApiNoContentResponse({ description: 'All users and related data deleted' }),
    ApiUnauthorizedResponse({
      description: 'Administrator credentials required',
    }),
  );
}
