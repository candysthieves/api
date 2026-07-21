import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtRefreshPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtAdapter {
  private readonly jwt_secret_key: string;
  private readonly jwt_secret_refresh_key: string;
  private readonly jwt_expires_in: JwtSignOptions['expiresIn'];
  private readonly jwt_refresh_expires_in: JwtSignOptions['expiresIn'];

  constructor(private readonly jwtService: JwtService) {
    this.jwt_secret_key = 'jwt-secret';
    this.jwt_secret_refresh_key = 'jwt-refresh';
    this.jwt_expires_in = '15m';
    this.jwt_refresh_expires_in = '7d';
  }

  async createAccessToken(userId: string) {
    const payload = {
      userId: userId.toString(),
    };

    try {
      return this.jwtService.signAsync(payload, {
        secret: this.jwt_secret_key,
        expiresIn: this.jwt_expires_in,
      });
    } catch {
      throw new InternalServerErrorException('Token generation failed');
    }
  }

  async createRefreshToken(userId: string, sessionId: string) {
    try {
      const payload = { userId: userId.toString(), sessionId };

      return this.jwtService.signAsync(payload, {
        secret: this.jwt_secret_refresh_key,
        expiresIn: this.jwt_refresh_expires_in,
      });
    } catch {
      throw new InternalServerErrorException('RefreshToken generation failed');
    }
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      return this.jwtService.verifyAsync(refreshToken, {
        secret: this.jwt_secret_refresh_key,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
