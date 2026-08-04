import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { LoginDto } from '../../../dto/login.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/user-repositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { SessionEntity } from '../../../domain/entities/session.entity.js';
import { SessionsRepository } from '../../../repositories/session-repositories/sessions.repository.js';
import { AppConfig } from '../../../../../app.config.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';

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
    private readonly jwtAdapter: JwtAdapter,
    private readonly hashAdapter: HashAdapter,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly config: AppConfig,
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
      DomainExceptions.unauthorized('credentials', 'Invalid email or password');
    }

    const isPasswordCorrect: boolean = await this.hashAdapter.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      DomainExceptions.unauthorized('credentials', 'Invalid email or password');
    }

    const session = SessionEntity.create({
      userId: user.id,
      ip,
      deviceName: userAgent,
      lifetimeMs: this.config.refreshTokenMaxAge,
    });
    await this.sessionsRepository.save(session);

    const accessToken: string = await this.jwtAdapter.createAccessToken(
      user.id,
    );
    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      user.id,
      session.id,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
