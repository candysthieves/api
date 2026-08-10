import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiGoogleCallback() {
  return applyDecorators(
    ApiOperation({
      summary: ' Google OAuth callback (called by Google)',
      description:
        'Called by Google after user authentication. GoogleAuthGuard validates the response and attaches the Google profile to the request.',
    }),
    ApiOkResponse({
      description:
        'Authentication completed successfully.Access and refresh tokens are returned.',
    }),
    ApiUnauthorizedResponse({
      description:
        'Google authentication failed because the user denied access, the authorization code is missing or invalid, or the Google profile could not be retrieved',
    }),
  );
}
