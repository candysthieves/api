import { Request } from 'express';
import { JwtRefreshPayload } from './jwt-payload.type.js';

export interface RequestWithUser extends Request {
  user: JwtRefreshPayload;
}
