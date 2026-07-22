import { Controller, Get, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { QueryBus } from '@nestjs/cqrs';
import { FindAllSessionsQuery } from '../application/query-handler/sessions/find-sessions-query-handler.js';
import { SessionView } from './view-types/sessions/sessionView.type.js';

@Controller('security')
export class SessionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('devices')
  async getAllSessionsForUser(@Req() req: Request): Promise<SessionView[]> {
    const refreshToken = req.cookies.refreshToken as string;
    return this.queryBus.execute<FindAllSessionsQuery, SessionView[]>(
      new FindAllSessionsQuery(refreshToken),
    );
  }
}
