import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AppConfig } from '../../app.config.js';
import { isProdHelper } from '../helpers/is-prod.helper.js';

@Injectable()
export class CookieAdapter {
  constructor(private readonly config: AppConfig) {}
  setRefreshCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProdHelper(),
      maxAge: this.config.refreshTokenMaxAge,
      sameSite: 'strict',
    });
  }
  clearRefreshCookie(res: Response) {
    res.clearCookie('refreshToken');
  }
}
