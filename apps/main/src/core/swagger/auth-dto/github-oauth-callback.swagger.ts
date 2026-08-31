import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiFoundResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiGithubCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'GitHub OAuth callback (called by GitHub)',
      description:
        'Called by GitHub after user authentication. GithubAuthGuard validates the response and attaches the GitHub profile to the request.',
    }),
    ApiFoundResponse({
      description:
        'Authentication completed successfully. The browser is redirected to the client application.',
    }),
    ApiBadRequestResponse({
      description: 'GitHub account did not provide an email address.',
    }),
    ApiUnauthorizedResponse({
      description:
        'GitHub authentication failed because the user denied access or the authorization code is invalid.',
    }),
  );
}
