// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';
import { FilesModule } from '../../files/src/files.module.js';
import { AppConfig } from './app.config.js';

@Module({
  imports: [configModule, UserAccountsModule, FilesModule],
  controllers: [AppController],
  providers: [PrismaService, AppConfig],
})
export class AppModule {}
