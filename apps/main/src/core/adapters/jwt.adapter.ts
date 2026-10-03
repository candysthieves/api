import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../types/jwt-payload.type.js';
import { DomainExceptions } from '../exceptions/domain-exceptions.js';
import { ErrorStatus } from '../exceptions/domain-exception-code.js';

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

  async createAccessToken(userId: number) {
    const payload = { userId: String(userId) };

    return this.jwtService.signAsync(payload, {
      secret: this.jwt_secret_key,
      expiresIn: this.jwt_expires_in,
    });
  }

  async createRefreshToken(userId: number, sessionId: string) {
    const payload = { userId: String(userId), sessionId };

    return this.jwtService.signAsync(payload, {
      secret: this.jwt_secret_refresh_key,
      expiresIn: this.jwt_refresh_expires_in,
    });
  }

  async verifyAccessToken(accessToken: string): Promise<JwtAccessPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        accessToken,
        { secret: this.jwt_secret_key },
      );
      return { ...payload, userId: Number(payload.userId) };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        DomainExceptions.unauthorized(
          ErrorStatus.ACCESS_TOKEN_EXPIRED,
          'token',
          'Access token has expired',
        );
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        DomainExceptions.invalidToken(
          ErrorStatus.ACCESS_TOKEN_INVALID,
          'token',
          'Invalid access token',
        );
      }

      throw error;
    }
  }

  decodeRefreshToken(refreshToken: string): JwtRefreshPayload {
    const payload = this.jwtService.decode<JwtRefreshPayload>(refreshToken);
    return { ...payload, userId: Number(payload.userId) };
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        { secret: this.jwt_secret_refresh_key },
      );
      return { ...payload, userId: Number(payload.userId) };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        DomainExceptions.unauthorized(
          ErrorStatus.REFRESH_TOKEN_EXPIRED,
          'token',
          'Refresh token has expired',
        );
      }

      if (error instanceof Error && error.name === 'JsonWebTokenError') {
        DomainExceptions.invalidToken(
          ErrorStatus.REFRESH_TOKEN_INVALID,
          'token',
          'Invalid refresh token',
        );
      }

      throw error;
    }
  }
}
