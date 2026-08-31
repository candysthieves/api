import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { FilesConfig } from './files.config.js';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module.js';
import { FilesService } from './modules/files/application/files.service.js';
import { FilesController } from './modules/files/api/files.controller.js';

@Module({
  imports: [configModule, RabbitMqModule],
  controllers: [FilesController],
  providers: [FilesConfig, FilesService],
})
export class FilesModule {}
