import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';
import { LoginDto } from '../../../dto/login.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../repositories/userRepositories/users.repository.js';
import { UserEntity } from '../../../domain/entities/user.entity.js';
import { UnauthorizedException } from '@nestjs/common';
import { SessionEntity } from '../../../domain/entities/session.entity.js';
import { SessionsRepository } from '../../../repositories/sessionRepositories/sessions.repository.js';

const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

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
      throw new UnauthorizedException();
    }

    const isPasswordCorrect: boolean = await this.hashAdapter.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException();
    }

    const session = SessionEntity.create({
      userId: user.id,
      ip,
      deviceName: userAgent,
      lifetimeMs: REFRESH_TOKEN_LIFETIME_MS,
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
