import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshPayload } from '../types/jwt-payload.type.js';

@Injectable()
export class JwtAdapter {
  private readonly jwt_secret_key: string;
  private readonly jwt_secret_refresh_key: string;
  private readonly jwt_expires_in: JwtSignOptions['expiresIn'];
  private readonly jwt_refresh_expires_in: JwtSignOptions['expiresIn'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwt_secret_key = this.configService.getOrThrow('JWT_SECRET_KEY');
    this.jwt_secret_refresh_key = this.configService.getOrThrow(
      'JWT_SECRET_REFRESH_KEY',
    );
    this.jwt_expires_in = this.configService.getOrThrow('JWT_EXPIRES_IN');
    this.jwt_refresh_expires_in = this.configService.getOrThrow(
      'JWT_REFRESH_EXPIRES_IN',
    );
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
