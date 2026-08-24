import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFileCommand } from '../application/use-cases/upload-file.usecase.js';
import { FileType } from '../schemas/files.schema.js';

@Controller('upload')
export class FilesController {
  constructor(private readonly commandBus: CommandBus) {}
  @Get('hi')
  hello() {
    return 'hi';
  }

  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file'))
  async testUpload(@UploadedFile() file: Express.Multer.File) {
    return this.commandBus.execute<UploadFileCommand, void>(
      new UploadFileCommand(file, FileType.POST),
    );
  }
}
