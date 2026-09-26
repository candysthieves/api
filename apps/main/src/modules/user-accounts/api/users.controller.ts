import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
  Put,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetUsersCountQuery } from '../application/query-handler/users/get-users-count-query-handler.js';
import { GetUsersCountType } from './view-types/users/get-users-count.type.js';
import { ApiGetUsersCount } from '../../../core/swagger/user-dto/get-users-count.swagger.js';
import { GetUserProfileQuery } from '../application/query-handler/users/get-user-profile-query-handler.js';
import { GetUserProfileType } from './view-types/users/get-user-profile.type.js';
import { User } from './decorators/user.decorator.js';
import type { JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { ApiGetUserProfile } from '../../../core/swagger/user-dto/get-user-profile.swagger.js';
import { ApiUpdateMyProfile } from '../../../core/swagger/user-dto/update-my-profile.swagger.js';
import { UpdateMyProfileCommand } from '../application/use-cases/users-use-cases/update-my-profile.usecase.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { MyProfileType } from './view-types/users/my-profile.type.js';
import { GetAvatarQuery } from '../application/query-handler/users/get-avatar-query-handler.js';
import { GetMyAvatarType } from './view-types/users/get-my-avatar.type.js';
import { ApiGetMyAvatar } from '../../../core/swagger/user-dto/get-my-avatar.swagger.js';
import { ApiUpdateMyAvatar } from '../../../core/swagger/user-dto/update-my-avatar.swagger.js';
import { UpdateMyAvatarCommand } from '../application/use-cases/users-use-cases/update-my-avatar.usecase.js';
import { OptionalAccessTokenGuard } from './guards/optional-access-token.guard.js';
import { DeleteMyAvatarCommand } from '../application/use-cases/users-use-cases/delete-my-avatar.usecase.js';
import { ApiDeleteMyAvatar } from '../../../core/swagger/user-dto/delete-my-avatar.swagger.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('count')
  @ApiGetUsersCount()
  async getUsersCount(): Promise<GetUsersCountType> {
    return this.queryBus.execute<GetUsersCountQuery, GetUsersCountType>(
      new GetUsersCountQuery(),
    );
  }

  //'owner' | 'user' | 'friend'
  //"viewerStatus": "user"
  @Get('profile/:userId')
  @UseGuards(OptionalAccessTokenGuard)
  @ApiGetUserProfile()
  async getUserProfile(
    @Param('userId') userId: string,
    @User() user: JwtAccessPayload | null,
  ): Promise<GetUserProfileType> {
    return this.queryBus.execute<GetUserProfileQuery, GetUserProfileType>(
      new GetUserProfileQuery(userId, user ? user.userId : null),
    );
  }

  @Patch('my-profile')
  @UseGuards(AccessTokenGuard)
  @ApiUpdateMyProfile()
  async updateMyProfile(
    @Body() dto: UpdateProfileDto = {},
    @User() user: JwtAccessPayload,
  ): Promise<MyProfileType> {
    return this.commandBus.execute<UpdateMyProfileCommand, MyProfileType>(
      new UpdateMyProfileCommand(user.userId, dto),
    );
  }

  @Get('my-avatar')
  @UseGuards(AccessTokenGuard)
  @ApiGetMyAvatar()
  getAvatar(@User() user: JwtAccessPayload): Promise<GetMyAvatarType> {
    return this.queryBus.execute<GetAvatarQuery, GetMyAvatarType>(
      new GetAvatarQuery(user.userId),
    );
  }

  @Put('my-avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }),
  )
  @ApiUpdateMyAvatar()
  async updateMyAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @User() user: JwtAccessPayload,
  ): Promise<{ userId: string }> {
    return this.commandBus.execute(
      new UpdateMyAvatarCommand(user.userId, file),
    );
  }

  @Delete('my-avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  @ApiDeleteMyAvatar()
  async deleteMyAvatar(@User() user: JwtAccessPayload): Promise<void> {
    await this.commandBus.execute<DeleteMyAvatarCommand, void>(
      new DeleteMyAvatarCommand(user.userId),
    );
  }
}
