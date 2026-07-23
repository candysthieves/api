import { RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../../../core/types/jwt-payload.type.js';

export const User = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    return data ? user?.[data] : user;
  },
);
