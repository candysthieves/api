import { CqrsModule } from '@nestjs/cqrs';
// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { CoreModule } from './core/core.module.js';
import { TestController } from './test.controller.js';

@Module({
  imports: [configModule, CoreModule, CqrsModule.forRoot(), UserAccountsModule],
  controllers:
    process.env.NODE_ENV === 'testing'
      ? [AppController, TestController]
      : [AppController],
})
export class AppModule {}
