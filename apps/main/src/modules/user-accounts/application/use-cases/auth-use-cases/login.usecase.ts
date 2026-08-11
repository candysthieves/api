import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { LoginDto } from '../../../dto/login.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { AuthSessionService } from '../../auth-session.service.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

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
  ) {}
  async execute({
    dto,
    ip,
    userAgent,
  }: LoginCommand): Promise<AccessAndRefreshTokensType> {
    const user: UserEntity | null = await this.usersRepository.findByEmail(
      dto.email,
    );

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
    const isPasswordCorrect: boolean = await this.hashAdapter.compare(
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

    return this.authSessionService.createSessionAndTokens(
      user.id,
      ip,
      userAgent,
    );
  }
}
