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
import {
  ApiTags,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FindAllSessionsQuery } from '../application/query-handler/sessions/find-sessions-query-handler.js';
import { SessionView } from './view-types/sessions/session-view.type.js';
import { DeleteOtherSessionsCommand } from '../application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';
import { RefreshTokenGuard } from '../guards/refresh-token.guard.js';
import { User } from '../decorators/user.decorator.js';
import type { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { DeactivateSessionCommand } from '../application/use-cases/sessions-use-cases/deactivate-session.usecase.js';
import { CookieAdapter } from '../../../core/adapters/cookie.adapter.js';

@ApiTags('Security')
@Controller('security')
export class SessionsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly cookieAdapter: CookieAdapter,
  ) {}

  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Get active sessions for the current user' })
  @ApiUnauthorizedResponse({
    description: 'A valid active refresh session is required.',
  })
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Get('devices')
  async getAllSessionsForUser(
    @User() user: JwtRefreshPayload,
  ): Promise<SessionView[]> {
    return this.queryBus.execute<FindAllSessionsQuery, SessionView[]>(
      new FindAllSessionsQuery(user.userId),
    );
  }

  @Delete('devices')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOtherSessions(@User() user: JwtRefreshPayload): Promise<void> {
    await this.commandBus.execute<DeleteOtherSessionsCommand, void>(
      new DeleteOtherSessionsCommand(user.userId, user.sessionId),
    );
  }

  @ApiCookieAuth('refreshToken')
  @ApiOperation({
    summary: "Deactivate one of the current user's device sessions",
  })
  @ApiParam({
    name: 'deviceId',
    description: 'Identifier of the device session',
  })
  @ApiNoContentResponse({
    description: 'Device session deactivated successfully.',
  })
  @ApiNotFoundResponse({ description: 'Device session was not found.' })
  @ApiUnauthorizedResponse({
    description: 'A valid active refresh session is required.',
  })
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('sessions/:sessionId')
  async deactivateSession(
    @Param('sessionId') sessionId: string,
    @User() user: JwtRefreshPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.commandBus.execute<DeactivateSessionCommand, void>(
      new DeactivateSessionCommand(user.userId, user.sessionId, sessionId),
    );
    // sessionId id полученная из query
    // user.sessionId id полученная из токена
    if (sessionId === user.sessionId) {
      this.cookieAdapter.clearRefreshCookie(res);
    }
  }
}
