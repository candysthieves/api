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
import { Logger } from '@nestjs/common';

export class LoginCommand {
  constructor(
    public readonly dto: LoginDto,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly requestId: string,
  ) {}
}

@CommandHandler(LoginCommand)
export class LoginUseCase implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginUseCase.name);
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
    requestId,
  }: LoginCommand): Promise<AccessAndRefreshTokensType> {
    const startedAt = Date.now();
    this.logger.log(JSON.stringify({ event: 'login_started', requestId }));

    const findUserStartedAt = Date.now();
    const user: User | null = await this.usersRepository.findByEmail(dto.email);
    this.logger.log(
      JSON.stringify({
        event: 'login_user_lookup_completed',
        durationMs: Date.now() - findUserStartedAt,
        requestId,
        userFound: Boolean(user),
      }),
    );

    if (user) {
      const findOAuthStartedAt = Date.now();
      const oAuthAccount = await this.oAuthRepository.findByUserId(user.id);
      this.logger.log(
        JSON.stringify({
          event: 'login_oauth_account_lookup_completed',
          durationMs: Date.now() - findOAuthStartedAt,
          requestId,
          userId: user.id,
          oAuthAccountFound: Boolean(oAuthAccount),
        }),
      );

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
    const verifyPasswordStartedAt = Date.now();
    const isPasswordCorrect: boolean = await this.hashAdapter.compare(
      dto.password,
      user.password,
    );
    this.logger.log(
      JSON.stringify({
        event: 'login_password_verification_completed',
        durationMs: Date.now() - verifyPasswordStartedAt,
        requestId,
        userId: user.id,
        passwordValid: isPasswordCorrect,
      }),
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
      requestId,
    );
    this.logger.log(
      JSON.stringify({
        event: 'login_completed',
        durationMs: Date.now() - startedAt,
        requestId,
        userId: user.id,
      }),
    );
    return tokens;
  }
}
