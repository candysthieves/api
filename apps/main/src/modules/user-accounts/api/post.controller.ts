import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Put,
  UploadedFiles,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreatePostCommand } from '../application/use-cases/posts-use-cases/create-post.use.case.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { User } from './decorators/user.decorator.js';
import { type JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { ApiCreatePost } from '../../../core/swagger/posts-dto/create-post.swagger.js';
import { GetAllPostsQuery } from '../application/query-handler/posts/get-all-posts.query-handler.js';
import { GetPostsQueryParamsDto } from './dto/get-posts-query-params.dto.js';
import { ApiHardDeletePost } from '../../../core/swagger/posts-dto/delete-post.swagger.js';
import { ApiRestorePost } from '../../../core/swagger/posts-dto/restore-post.swagger.js';
import { HardDeletePostCommand } from '../application/use-cases/posts-use-cases/hard-delete-post.usecase.js';
import { RestorePostCommand } from '../application/use-cases/posts-use-cases/restore-post.usecase.js';
import { SoftDeletePostCommand } from '../application/use-cases/posts-use-cases/soft-delete-post.usecase.js';
import { ApiSoftDeletePost } from '../../../core/swagger/posts-dto/soft-delete-post.swagger.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { UpdatePostCommand } from '../application/use-cases/posts-use-cases/update-post.usecase.js';
import { ApiUpdatePost } from '../../../core/swagger/posts-dto/update-post.swagger.js';
import { ApiGetAllPosts } from '../../../core/swagger/posts-dto/get-posts.swagger.js';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('all-posts')
  @ApiGetAllPosts()
  getAllPosts(@Query() query: GetPostsQueryParamsDto) {
    return this.queryBus.execute<GetAllPostsQuery>(
      new GetAllPostsQuery(query.cursor, query.limit),
    );
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 8, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @UseGuards(AccessTokenGuard)
  @ApiCreatePost()
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @Body() createDto: CreatePostDto,
    @User() user: JwtAccessPayload,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: Request,
  ): Promise<{ postId: string }> {
    return this.commandBus.execute(
      new CreatePostCommand(
        createDto.description,
        user.userId,
        files,
        createDto.location,
        (request as Request & { requestId?: string }).requestId ?? '',
      ),
    );
  }

  @Put(':postId')
  @UseGuards(AccessTokenGuard)
  @ApiUpdatePost()
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() updateDto: UpdatePostDto,
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<UpdatePostCommand, void>(
      new UpdatePostCommand(postId, user.userId, updateDto.description),
    );
  }

  @Delete(':postId/hard-delete')
  @UseGuards(AccessTokenGuard)
  @ApiHardDeletePost()
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDeletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<HardDeletePostCommand, void>(
      new HardDeletePostCommand(postId, user.userId),
    );
  }

  @Delete(':postId/soft-delete')
  @UseGuards(AccessTokenGuard)
  @ApiSoftDeletePost()
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDeletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<SoftDeletePostCommand, void>(
      new SoftDeletePostCommand(postId, user.userId),
    );
  }

  @Post(':postId/restore')
  @UseGuards(AccessTokenGuard)
  @ApiRestorePost()
  @HttpCode(HttpStatus.NO_CONTENT)
  async restorePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<RestorePostCommand, void>(
      new RestorePostCommand(postId, user.userId),
    );
  }
}
