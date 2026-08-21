import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller.js';
import { FilesService } from './services/files.service.js';

@Module({
  imports: [],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
