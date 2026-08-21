import { Module } from '@nestjs/common';
import { FilesModule } from './src/modules/files/files.module.js';

@Module({
  imports: [FilesModule],
})
export class AppModule {}
