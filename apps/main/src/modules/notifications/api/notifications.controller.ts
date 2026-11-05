import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../user-accounts/api/guards/access-token.guard.js';
import { User } from '../../user-accounts/api/decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { GetNotificationsQueryParamsDto } from './dto/get-notifications-query-params.dto.js';
import { MarkNotificationsAsReadDto } from './dto/mark-notifications-as-read.dto.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { GetNotificationsQuery } from '../application/query-handler/get-notifications.query-handler.js';
import { MarkNotificationsAsReadCommand } from '../application/use-cases/mark-notifications-as-read.usecase.js';
import { CreateNotificationCommand } from '../application/use-cases/create-notification.usecase.js';
import { PaginatedNotificationsViewType } from './view-types/paginated-notifications-view.type.js';
import { ApiGetNotifications } from '../../../core/swagger/notifications-dto/get-notifications.swagger.js';
import { ApiMarkNotificationsAsRead } from '../../../core/swagger/notifications-dto/mark-notifications-as-read.swagger.js';
import { ApiCreateNotification } from '../../../core/swagger/notifications-dto/create-notification.swagger.js';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('all')
  @UseGuards(AccessTokenGuard)
  @ApiGetNotifications()
  async getNotifications(
    @User() user: JwtAccessPayload,
    @Query() query: GetNotificationsQueryParamsDto,
  ): Promise<PaginatedNotificationsViewType> {
    return this.queryBus.execute<
      GetNotificationsQuery,
      PaginatedNotificationsViewType
    >(
      new GetNotificationsQuery(
        user.userId.toString(),
        query.pageSize,
        query.cursor,
      ),
    );
  }

  @Patch('mark-as-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiMarkNotificationsAsRead()
  async markNotificationsAsRead(
    @User() user: JwtAccessPayload,
    @Body() dto: MarkNotificationsAsReadDto,
  ): Promise<void> {
    await this.commandBus.execute<MarkNotificationsAsReadCommand, void>(
      new MarkNotificationsAsReadCommand(user.userId.toString(), dto.ids),
    );
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiCreateNotification()
  async createNotification(
    @User() user: JwtAccessPayload,
    @Body() dto: CreateNotificationDto,
  ): Promise<void> {
    await this.commandBus.execute<CreateNotificationCommand, void>(
      new CreateNotificationCommand({
        ...dto,
        userId: user.userId.toString(),
      }),
    );
  }
}
