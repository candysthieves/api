import { Injectable } from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { AppConfig } from '../../app.config.js';
import { isProdHelper } from '../helpers/is-prod.helper.js';

@Injectable()
export class CookieAdapter {
  constructor(private readonly config: AppConfig) {}

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: isProdHelper(),
      sameSite: 'strict',
      path: '/',
    };
  }
  setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      ...this.getRefreshCookieOptions(),
      maxAge: this.config.refreshTokenMaxAge,
    });
  }
  clearRefreshCookie(res: Response) {
    res.clearCookie('refreshToken', this.getRefreshCookieOptions());
  }
}
