import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { LoginDto } from '../../../api/dto/login.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { AuthSessionService } from '../../auth-session.service.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { OAuthRepository } from '../../../infrastructure/repositories/oauth-repositories/oauth.repository.js';
import { User } from '../../../../../generated/prisma/client.js';

export class LoginCommand {
  constructor(
    public readonly dto: LoginDto,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {}
}

@CommandHandler(LoginCommand)
export class LoginUseCase implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly hashAdapter: HashAdapter,
    private readonly authSessionService: AuthSessionService,
    private readonly usersRepository: UsersRepository,
    private readonly oAuthRepository: OAuthRepository,
  ) {}
  async execute({
    dto,
    ip,
    userAgent,
  }: LoginCommand): Promise<AccessAndRefreshTokensType> {
    const user: User | null = await this.usersRepository.findByEmail(dto.email);

    if (user) {
      const oAuthAccount = await this.oAuthRepository.findByUserId(user.id);

      if (oAuthAccount) {
        DomainExceptions.badRequest(
          ErrorStatus.INVALID_CREDENTIALS,
          'credentials',
          `Could not log in. Please check your email and password or use password recovery.`,
        );
      }
    }

    if (!user) {
      DomainExceptions.unauthorized(
        ErrorStatus.INVALID_CREDENTIALS,
        'credentials',
        'Invalid email or password',
      );
    }
    if (!user.isEmailConfirmed) {
      DomainExceptions.unauthorized(
        ErrorStatus.EMAIL_NOT_CONFIRMED,
        'email',
        'Email is not confirmed',
      );
    }
    const isPasswordCorrect = await this.hashAdapter.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      DomainExceptions.unauthorized(
        ErrorStatus.INVALID_CREDENTIALS,
        'credentials',
        'Invalid email or password',
      );
    }

    const tokens = await this.authSessionService.createSessionAndTokens(
      user.id,
      ip,
      userAgent,
    );
    return tokens;
  }
}
