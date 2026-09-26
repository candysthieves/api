import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiDeleteMyAvatar() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Delete your avatar',
      description:
        'Removes the current avatar immediately. Stored avatar files are deleted by a background scheduler.',
    }),
    ApiNoContentResponse({ description: 'Avatar was removed.' }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
}
