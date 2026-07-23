import { CqrsModule } from '@nestjs/cqrs';
// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { CoreModule } from './core/core.module.js';
// import { AppConfig } from './app.config.js';

@Module({
  imports: [configModule, CoreModule, CqrsModule.forRoot(), UserAccountsModule],
  controllers: [AppController],
  // providers: [AppConfig],
  // exports: [AppConfig],
})
export class AppModule {}
