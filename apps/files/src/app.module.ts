import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { FilesConfig } from './files.config.js';

@Module({
  imports: [configModule],
  providers: [FilesConfig],
})
export class AppModule {}
