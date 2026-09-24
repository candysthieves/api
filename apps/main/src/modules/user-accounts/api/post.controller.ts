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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { GetPostByIdQuery } from '../application/query-handler/posts/get-post-by-id.query-handler.js';
import { GetDeletedPostByIdQuery } from '../application/query-handler/posts/get-deleted-post-by-id.query-handler.js';
import { GetMyDeletedPostsQuery } from '../application/query-handler/posts/get-my-deleted-posts.query-handler.js';
import { PostByIdViewType } from './view-types/posts/post-by-id-view.type.js';
import { PostWithAuthorViewType } from './view-types/posts/post-with-author-view.type.js';
import { GetAllPostsViewType } from './view-types/posts/get-posts-view.type.js';
import { ApiGetPostById } from '../../../core/swagger/posts-dto/get-post-by-id.swagger.js';
import { ApiGetDeletedPostById } from '../../../core/swagger/posts-dto/get-deleted-post-by-id.swagger.js';
import { ApiGetMyDeletedPosts } from '../../../core/swagger/posts-dto/get-my-deleted-posts.swagger.js';
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
import { ApiUserPosts } from '../../../core/swagger/posts-dto/get-user-posts.swagger.js';
import { FindPostsByUserIdAndCursorQuery } from '../application/query-handler/posts/find-posts-by-user-id-and-cursor.query-handler.js';

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

  //'owner' | 'user' | 'friend'
  //"viewerStatus": "user"
  @Get(':userId')
  @UseGuards(AccessTokenGuard)
  @ApiUserPosts()
  getPostsForUser(
    @Query() query: GetPostsQueryParamsDto,
    @Param('userId') userId: string,
    @User() user: JwtAccessPayload,
  ) {
    return this.queryBus.execute(
      new FindPostsByUserIdAndCursorQuery(
        userId,
        user.userId,
        query.cursor,
        query.limit,
      ),
    );
  }

  //'owner' | 'user' | 'friend'
  //"viewerStatus": "user"
  @Get(':postId')
  @UseGuards(AccessTokenGuard)
  @ApiGetPostById()
  getPostById(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<PostByIdViewType> {
    return this.queryBus.execute<GetPostByIdQuery, PostByIdViewType>(
      new GetPostByIdQuery(postId, user.userId),
    );
  }

  @Get('deleted-posts')
  @UseGuards(AccessTokenGuard)
  @ApiGetMyDeletedPosts()
  getMyDeletedPosts(
    @Query() query: GetPostsQueryParamsDto,
    @User() user: JwtAccessPayload,
  ): Promise<GetAllPostsViewType> {
    return this.queryBus.execute<GetMyDeletedPostsQuery, GetAllPostsViewType>(
      new GetMyDeletedPostsQuery(user.userId, query.cursor, query.limit),
    );
  }

  @Get('deleted-posts/:postId')
  @UseGuards(AccessTokenGuard)
  @ApiGetDeletedPostById()
  getDeletedPostById(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<PostWithAuthorViewType> {
    return this.queryBus.execute<
      GetDeletedPostByIdQuery,
      PostWithAuthorViewType
    >(new GetDeletedPostByIdQuery(postId, user.userId));
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
  ): Promise<{ postId: string }> {
    return this.commandBus.execute(
      new CreatePostCommand(
        createDto.description,
        user.userId,
        files,
        createDto.location,
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
