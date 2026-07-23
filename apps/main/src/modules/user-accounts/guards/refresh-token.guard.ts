import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { RequestWithUser } from '../../../core/types/request-with-user.type.js';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly jwtAdapter: JwtAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const cookies = req.cookies as { refreshToken?: string };
    const token = cookies.refreshToken;
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload: JwtRefreshPayload =
      await this.jwtAdapter.verifyRefreshToken(token);

    req.user = {
      userId: payload.userId,
    };

    return true;
  }
}
