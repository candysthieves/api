import { Request } from 'express';
import { JwtRefreshPayload } from './jwt-payload.type.js';

export type RequestWithUser<T = JwtRefreshPayload> = Request & {
  user: T;
};
