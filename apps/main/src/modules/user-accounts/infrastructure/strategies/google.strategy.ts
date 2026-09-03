import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../../app.config.js';
import { OAuthProfileDto } from '../../api/dto/oauth-profile.dto.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

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
    // Google может не вернуть email, даже если запрошен соответствующий scope.
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!email) {
      DomainExceptions.badRequest(
        ErrorStatus.OAUTH_EMAIL_MISSING,
        'email',
        'Google account did not provide an email address',
      );
    }

    return {
      provider: 'google',
      providerId: profile.id,
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
