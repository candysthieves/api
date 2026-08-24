import {
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadFilesCommand } from '../application/use-cases/upload-files.usecase.js';
import { FileType } from '../schemas/files.schema.js';
import { GetFilesQuery } from '../application/use-cases/get-files.usecase.js';

@Controller('upload')
export class FilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  getFiles() {
    return this.queryBus.execute(new GetFilesQuery());
  }

  @Post('test-upload')
  @UseInterceptors(FilesInterceptor('files', 8))
  async testUpload(@UploadedFiles() files: Express.Multer.File[]) {
    return this.commandBus.execute<UploadFilesCommand, void>(
      new UploadFilesCommand(files, FileType.POST),
    );
  }
}
