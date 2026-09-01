import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUsersCountQuery } from '../application/query-handler/users/get-users-count-query-handler.js';
import { GetUsersCountType } from './view-types/users/get-users-count.type.js';
import { ApiGetUsersCount } from '../../../core/swagger/user-dto/get-users-count.swagger.js';

@Controller('users')
export class UsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('count')
  @ApiGetUsersCount()
  async getUsersCount(): Promise<GetUsersCountType> {
    return this.queryBus.execute<GetUsersCountQuery, GetUsersCountType>(
      new GetUsersCountQuery(),
    );
  }
}
