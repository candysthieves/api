import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OAuthProfileDto } from '../../../dto/oauth-profile.dto.js';
import { OAuthRepository } from '../../../repositories/oauth-repositories/oauth.repository.js';
import { OAuthAccountEntity } from '../../../domain/entities/oauth-account.entity.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { AuthSessionService } from '../../auth-session.service.js';

export class OAuthLoginCommand {
  constructor(
    public readonly profile: OAuthProfileDto,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {}
}

@CommandHandler(OAuthLoginCommand)
export class OAuthLoginUseCase implements ICommandHandler<OAuthLoginCommand> {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly oauthRepository: OAuthRepository,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(dto: OAuthLoginCommand): Promise<AccessAndRefreshTokensType> {
    const { profile, ip, userAgent } = dto;

    const oauthAccount: OAuthAccountEntity | null =
      await this.oauthRepository.findByProvider(
        profile.provider,
        profile.providerId,
      );

    let user: UserEntity | null;

    if (oauthAccount) {
      user = await this.usersRepository.findByIdOrNotFound(oauthAccount.userId);
    } else {
      user = await this.usersRepository.findByEmail(profile.email);

      const username: string = await this.generateUniqueUsername(profile.email);

      if (!user) {
        user = UserEntity.create(profile.email, username, '', new Date(), true);

        await this.usersRepository.create(user);
      }

      const newOAuthAccount: OAuthAccountEntity = OAuthAccountEntity.create(
        user.id,
        profile.provider,
        profile.providerId,
        user.email,
      );

      await this.oauthRepository.create(newOAuthAccount);
    }

    return this.authSessionService.createSessionAndTokens(
      user.id,
      ip,
      userAgent,
    );
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const base: string = email.split('@')[0];

    let username: string = base;
    let counter: number = 1;

    while (await this.usersRepository.findByUsername(username)) {
      username = `${base}${counter}`;
      counter++;
    }

    return username;
  }
}
