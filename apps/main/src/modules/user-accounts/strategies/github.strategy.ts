import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-github2';
import { AppConfig } from '../../../app.config.js';
import { OAuthProfileDto } from '../dto/oauth-profile.dto.js';

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
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('GitHub account does not have an email');
    }

    return {
      provider: 'github',
      providerId: profile.id,
      email,
    };
  }
}
