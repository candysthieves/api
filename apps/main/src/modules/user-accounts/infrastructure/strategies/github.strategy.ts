import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-github2';
import { AppConfig } from '../../../../app.config.js';
import { OAuthProfileDto } from '../../api/dto/oauth-profile.dto.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly config: AppConfig) {
    super({
      callbackURL: config.githubCallbackUrl,
      clientID: config.githubClientId,
      clientSecret: config.githubClientSecret,
      scope: ['user:email'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): OAuthProfileDto {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!email) {
      DomainExceptions.badRequest(
        ErrorStatus.OAUTH_EMAIL_MISSING,
        'email',
        'GitHub account did not provide an email address',
      );
    }

    return {
      provider: 'github',
      providerId: profile.id,
      email,
      firstName: profile.displayName || undefined,
    };
  }
}
