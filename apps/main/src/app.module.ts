import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';
import { CoreModule } from './core/core.module.js';

@Module({
  imports: [
    CoreModule,
    CqrsModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    UserAccountsModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
