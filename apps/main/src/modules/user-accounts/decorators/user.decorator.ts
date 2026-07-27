// import { RequestWithUser } from '../../../core/types/request-with-user.type.js';
// import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// import { AuthUser } from '../../../core/types/jwt-payload.type.js';
//
// export const User = createParamDecorator(
//   (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
//     const request: RequestWithUser = ctx.switchToHttp().getRequest();
//     const user = request.user as AuthUser;
//
//     return data ? user?.[data] : user;
//   },
// );

// Написал новую логику, старую закомментил на всякий случай. таким образом мы сможем избавиться от неявного типа AuthUser, без нарушения логики и не сломать типы
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../../../core/types/request-with-user.type.js';

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
