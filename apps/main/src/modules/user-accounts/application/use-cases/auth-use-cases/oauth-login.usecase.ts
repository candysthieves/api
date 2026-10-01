import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { OAuthProfileDto } from '../../../api/dto/oauth-profile.dto.js';
import { OAuthRepository } from '../../../infrastructure/repositories/oauth-repositories/oauth.repository.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { AuthSessionService } from '../../auth-session.service.js';
import { OAuthAccount, User } from '../../../../../generated/prisma/client.js';
import { UserCreateInput } from '../../../../../generated/prisma/models/User.js';
import { UserDataFactory } from '../../factories/user-data.factory.js';
import { OAuthAccountDataFactory } from '../../factories/oauth-account-data.factory.js';
import {
  TRANSACTION_MANAGER,
  TransactionClient,
  type TransactionManager,
} from '../../../../../core/database/transaction-manager.js';

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
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(dto: OAuthLoginCommand): Promise<AccessAndRefreshTokensType> {
    const { profile, ip, userAgent } = dto;

    const oauthAccount: OAuthAccount | null =
      await this.oauthRepository.findByProvider(
        profile.provider,
        profile.providerId,
      );

    let user: User | null;

    if (oauthAccount) {
      user = await this.usersRepository.findByIdOrNotFound(oauthAccount.userId);
    } else {
      user = await this.transactionManager.run(
        async (tx: TransactionClient) => {
          let existingUser: User | null =
            await this.usersRepository.findByEmail(profile.email);

          if (!existingUser) {
            const username: string = await this.generateUniqueUsername(
              profile.email,
              tx,
            );

            const userData: UserCreateInput = UserDataFactory.prepareCreateData(
              profile.email,
              username,
              '',
              new Date(),
              true,
              profile.firstName,
              profile.lastName,
            );

            existingUser = await this.usersRepository.create(userData, tx);
          }

          const oAuthAccountData = OAuthAccountDataFactory.prepareCreateData(
            existingUser.id,
            profile.provider,
            profile.providerId,
            existingUser.email,
          );

          await this.oauthRepository.create(oAuthAccountData, tx);

          return existingUser;
        },
      );
    }

    return this.authSessionService.createSessionAndTokens(
      user.id,
      ip,
      userAgent,
    );
  }

  private async generateUniqueUsername(
    email: string,
    tx?: TransactionClient,
  ): Promise<string> {
    const base: string = email.split('@')[0];

    let username: string = base;
    let counter: number = 1;

    while (await this.usersRepository.findByUsername(username, tx)) {
      username = `${base}${counter}`;
      counter++;
    }

    return username;
  }
}
