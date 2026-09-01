import { applyDecorators } from '@nestjs/common';
import { ApiFoundResponse, ApiOperation } from '@nestjs/swagger';

export function ApiGoogleAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sign in with Google',
      description:
        'Public endpoint protected by GoogleAuthGuard. Redirects the browser to Google OAuth consent screen.',
    }),
    ApiFoundResponse({
      description: 'Browser is redirected to Google for authentication.',
    }),
  );
}
