import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { FindAllSessionsQuery } from '../application/query-handler/sessions/find-sessions-query-handler.js';
import { SessionView } from './view-types/sessions/session-view.type.js';
import { DeleteOtherSessionsCommand } from '../application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { User } from './decorators/user.decorator.js';
import type { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { DeactivateSessionCommand } from '../application/use-cases/sessions-use-cases/deactivate-session.usecase.js';
import { CookieAdapter } from '../../../core/adapters/cookie.adapter.js';
import { ApiGetAllSessionsForTheCurrentUser } from '../../../core/swagger/sessionDTO/get_all_devices_for_current_user_swagger_flow.js';
import { ApiDeleteOtherSessionExceptCurrentOne } from '../../../core/swagger/sessionDTO/delete_other_session_swagger_flow.js';
import { ApiTerminateSessionById } from '../../../core/swagger/sessionDTO/delete_session_by_id_swagger_flow.js';

@ApiTags('SecurityDevices')
@Controller('security')
export class SessionsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly cookieAdapter: CookieAdapter,
  ) {}

  @Get('session')
  @UseGuards(RefreshTokenGuard)
  @ApiGetAllSessionsForTheCurrentUser()
  @HttpCode(HttpStatus.OK)
  async getAllSessionsForUser(
    @User() user: JwtRefreshPayload,
  ): Promise<SessionView[]> {
    return this.queryBus.execute<FindAllSessionsQuery, SessionView[]>(
      new FindAllSessionsQuery(user.userId),
    );
  }

  @Delete('session')
  @UseGuards(RefreshTokenGuard)
  @ApiDeleteOtherSessionExceptCurrentOne()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOtherSessions(@User() user: JwtRefreshPayload): Promise<void> {
    await this.commandBus.execute<DeleteOtherSessionsCommand, void>(
      new DeleteOtherSessionsCommand(user.userId, user.sessionId),
    );
  }

  @Delete('session/:sessionId')
  @UseGuards(RefreshTokenGuard)
  @ApiTerminateSessionById()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateSession(
    @Param('sessionId') sessionId: string,
    @User() user: JwtRefreshPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.commandBus.execute<DeactivateSessionCommand, void>(
      new DeactivateSessionCommand(user.userId, user.sessionId, sessionId),
    );
    if (sessionId === user.sessionId) {
      this.cookieAdapter.clearRefreshCookie(res);
    }
  }
}
