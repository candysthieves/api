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
import { ApiCreatePost } from '../../../core/swagger/postsDTO/create-post-swagger.js';
import { ApiDeletePost } from '../../../core/swagger/postsDTO/delete-post-swagger.js';
import { DeletePostCommand } from '../application/use-cases/posts-use-cases/delete-post.usecase.js';
import { GetPostsQuery } from '../application/query-handler/posts/get-posts.query-handler.js';
import { GetPostsQueryParamsDto } from './dto/get-posts-query-params.dto.js';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  getPosts(@Query() query: GetPostsQueryParamsDto) {
    return this.queryBus.execute<GetPostsQuery>(
      new GetPostsQuery(query.cursor, query.limit),
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

  @Delete(':postId')
  @UseGuards(AccessTokenGuard)
  @ApiDeletePost()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @User() user: JwtAccessPayload,
  ): Promise<void> {
    await this.commandBus.execute<DeletePostCommand, void>(
      new DeletePostCommand(postId, user.userId),
    );
  }
}
