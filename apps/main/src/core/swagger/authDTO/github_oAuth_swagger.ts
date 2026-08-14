import { applyDecorators } from '@nestjs/common';
import { ApiFoundResponse, ApiOperation } from '@nestjs/swagger';

export function ApiGithubAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sign in with GitHub',
      description:
        'Public endpoint protected by GithubAuthGuard. Redirects the browser to GitHub OAuth consent screen.',
    }),
    ApiFoundResponse({
      description: 'Browser is redirected to GitHub for authentication.',
    }),
  );
}
