import { UnauthorizedException } from '@nestjs/common';
import type { Profile } from 'passport-github2';
import { AppConfig } from '../../../app.config.js';
import { GithubStrategy } from './github.strategy.js';

describe('GithubStrategy', () => {
  const strategy = new GithubStrategy({
    githubCallbackUrl: 'http://localhost:3000/api/v1/auth/github/callback',
    githubClientId: 'github-client-id',
    githubClientSecret: 'github-client-secret',
  } as AppConfig);

  it('maps the GitHub profile to the shared OAuth profile', () => {
    const profile = {
      id: '12345',
      emails: [{ value: 'user@example.com' }],
    } as Profile;

    expect(strategy.validate('', '', profile)).toEqual({
      provider: 'github',
      providerId: '12345',
      email: 'user@example.com',
    });
  });

  it('rejects a profile without an email', () => {
    expect(() => strategy.validate('', '', { id: '12345' } as Profile)).toThrow(
      UnauthorizedException,
    );
  });
});
