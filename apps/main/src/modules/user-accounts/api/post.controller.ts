import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CommandBus } from '@nestjs/cqrs';
import { CreatePostCommand } from '../application/use-cases/posts-use-cases/create-post.use.case.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { User } from './decorators/user.decorator.js';
import { type JwtAccessPayload } from '../../../core/types/jwt-payload.type.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { ApiCreatePost } from '../../../core/swagger/postsDTO/create-post-swagger.js';
import { ApiHardDeletePost } from '../../../core/swagger/postsDTO/delete-post-swagger.js';
import { ApiRestorePost } from '../../../core/swagger/postsDTO/restore-post-swagger.js';
import { HardDeletePostCommand } from '../application/use-cases/posts-use-cases/hard-delete-post.usecase.js';
import { RestorePostCommand } from '../application/use-cases/posts-use-cases/restore-post.usecase.js';
import { SoftDeletePostCommand } from '../application/use-cases/posts-use-cases/soft-delete-post.usecase.js';
import { ApiSoftDeletePost } from '../../../core/swagger/postsDTO/soft-delete-post-swagger.js';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly commandBus: CommandBus) {}

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
