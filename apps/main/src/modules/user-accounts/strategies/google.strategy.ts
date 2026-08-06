import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../app.config.js';
import { OAuthProfileDto } from '../dto/oauth-profile.dto.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: AppConfig) {
    super({
      callbackURL: config.googleCallbackUrl,
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): OAuthProfileDto {
    return {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails![0].value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
