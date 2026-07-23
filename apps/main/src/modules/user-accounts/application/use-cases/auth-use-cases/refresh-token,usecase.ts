import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthUser } from '../../../../../core/types/jwt-payload.type.js';
import { JwtAdapter } from '../../../../../core/adapters/jwt.adapter.js';
import { AccessAndRefreshTokensType } from '../../../../../core/types/access-and-refresh-tokens.type.js';

export class RefreshTokenCommand {
  constructor(public readonly payload: AuthUser) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenUseCase implements ICommandHandler<RefreshTokenCommand> {
  constructor(private readonly jwtAdapter: JwtAdapter) {}

  async execute({
    payload,
  }: RefreshTokenCommand): Promise<AccessAndRefreshTokensType> {
    const accessToken: string = await this.jwtAdapter.createAccessToken(
      payload.userId,
    );
    const refreshToken: string = await this.jwtAdapter.createRefreshToken(
      payload.userId,
      'sessionId',
      // НУЖНО ДОБАВИТЬ, ПОСТАВИЛ ЗАГЛУШКУ!
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
