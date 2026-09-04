import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUsersCountQuery } from '../application/query-handler/users/get-users-count-query-handler.js';
import { GetUsersCountType } from './view-types/users/get-users-count.type.js';
import { ApiGetUsersCount } from '../../../core/swagger/user-dto/get-users-count.swagger.js';
import { GetUserProfileQuery } from '../application/query-handler/users/get-user-profile-query-handler.js';
import { GetUserProfileType } from './view-types/users/get-user-profile.type.js';
import { User } from './decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { ApiGetUserProfile } from '../../../core/swagger/user-dto/get-user-profile.swagger.js';
import { GetPostsQueryParamsDto } from './dto/get-posts-query-params.dto.js';
import { FindPostsByUserIdAndCursorQuery } from '../application/query-handler/posts/find-posts-by-user-id-and-cursor.query-handler.js';
import { ApiUserPosts } from '../../../core/swagger/posts-dto/get-user-posts.swagger.js';

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

  @Get(':username/posts')
  @UseGuards(AccessTokenGuard)
  @ApiUserPosts()
  getPostsForUser(
    @Query() query: GetPostsQueryParamsDto,
    @Param('username') username: string,
    @User() user: JwtAccessPayload,
  ) {
    return this.queryBus.execute(
      new FindPostsByUserIdAndCursorQuery(
        username,
        user.userId,
        query.cursor,
        query.limit,
      ),
    );
  }

  @Get(':username/profile')
  @UseGuards(AccessTokenGuard)
  @ApiGetUserProfile()
  async getUserProfile(
    @Param('username') username: string,
    @User() user: JwtAccessPayload,
  ): Promise<GetUserProfileType> {
    const currentUserId: string = user.userId;

    return this.queryBus.execute<GetUserProfileQuery, GetUserProfileType>(
      new GetUserProfileQuery(username, currentUserId),
    );
  }
}
