import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { FilesController } from './files.controller.js';
import { FilesConfig } from './files.config.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [configModule],
  controllers: [FilesController],
  providers: [FilesConfig, FilesService],
})
export class FilesModule {}
