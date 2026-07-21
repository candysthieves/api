import { LoginDto } from '../dto/login.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { HashAdapter } from '../../../../../core/adapters/hash.adapter.js';
import { UsersRepository } from '../../../users/repositories/users.repository.js';
import { UserEntity } from '../../../users/ entities/user.entity.js';
import { UnauthorizedException } from '@nestjs/common';
import { AccessAndRefreshTokensType } from '../../types/access-and-refresh-tokens.type.js';

export class LoginCommand {
  constructor(public readonly dto: LoginDto) {}
}

@CommandHandler(LoginCommand)
export class LoginUseCase implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly jwtAdapter: JwtAdapter,
    private readonly hashAdapter: HashAdapter,
    private readonly usersRepository: UsersRepository,
  ) {}
  async execute({ dto }: LoginCommand): Promise<AccessAndRefreshTokensType> {
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

    const accessToken: string = await this.jwtAdapter.createAccessToken(
      user.id,
    );

    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      user.id,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
