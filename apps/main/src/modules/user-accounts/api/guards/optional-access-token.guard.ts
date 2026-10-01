import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtAdapter } from '../../../../core/adapters/jwt.adapter.js';
import { JwtAccessPayload } from '../../../../core/types/jwt-payload.type.js';

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(private readonly jwtAdapter: JwtAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader) {
      return true;
    }

    const match = authHeader.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      return true;
    }

    const [, accessToken] = match;

    try {
      const payload: JwtAccessPayload =
        await this.jwtAdapter.verifyAccessToken(accessToken);

      request.user = {
        ...payload,
      };
    } catch {
      // Игнорируем ошибки верификации токена, так как авторизация опциональна
    }

    return true;
  }
}
