import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FindAllSessionsQuery } from '../application/query-handler/sessions/find-sessions-query-handler.js';
import { SessionView } from './view-types/sessions/sessionView.type.js';
import { RefreshTokenGuard } from '../guards/refresh-token.guard.js';
import { User } from '../decorators/user.decorator.js';
import type { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { DeleteOtherSessionsCommand } from '../application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';

@Controller('security')
export class SessionsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get('devices')
  async getAllSessionsForUser(@Req() req: Request): Promise<SessionView[]> {
    const refreshToken = req.cookies.refreshToken as string;
    return this.queryBus.execute<FindAllSessionsQuery, SessionView[]>(
      new FindAllSessionsQuery(refreshToken),
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
}
