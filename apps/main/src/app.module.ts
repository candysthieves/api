// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';
import { FilesController } from '../../files/src/files.controller.js';
import { AuthController } from './modules/user-accounts/auth/auth.controller.js';
import { AppConfig } from './app.config.js';

@Module({
  imports: [configModule, UserAccountsModule],
  controllers: [AppController, FilesController, AuthController],
  providers: [PrismaService, AppConfig],
})
export class AppModule {}
