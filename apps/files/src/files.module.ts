import { Module } from '@nestjs/common';
import { configModule } from './config.js';
import { FilesController } from './files.controller.js';
import { FilesConfig } from './files.config.js';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module.js';
import { FilesService } from './files.service';

@Module({
  imports: [configModule, RabbitMqModule],
  controllers: [FilesController],
  providers: [FilesConfig, FilesService],
})
export class FilesModule {}
