import { CqrsModule } from '@nestjs/cqrs';
// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { CoreModule } from './core/core.module.js';
import { TestController } from './test.controller.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    configModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    CoreModule,
    CqrsModule.forRoot(),
    UserAccountsModule,
  ],
  controllers:
    process.env.NODE_ENV === 'testing'
      ? [AppController, TestController]
      : [AppController],
})
export class AppModule {}
