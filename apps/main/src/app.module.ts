import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';
import { FilesController } from '../../files/src/files.controller.js';
import { AuthController } from './modules/user-accounts/auth/auth.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 'apps/main/.env',
    }),
    UserAccountsModule,
  ],
  controllers: [AppController, FilesController, AuthController],
  providers: [PrismaService],
})
export class AppModule {}
