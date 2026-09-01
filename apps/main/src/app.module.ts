import { CqrsModule } from '@nestjs/cqrs';
// импорт configModule должен быть в самом верху
import { configModule } from './config.js';
import { Module } from '@nestjs/common';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module.js';
import { AppController } from './app.controller.js';
import { CoreModule } from './core/core.module.js';
import { RabbitMqModule } from './core/rabbitmq/rabbitmq.module.js';
import { RabbitMqTestController } from './core/rabbitmq/rabbitmq-test.controller.js';
import { TestController } from './test.controller.js';
import { RabbitMqModule } from './core/rabbitmq/rabbitmq.module.js';
import { EventsModule } from './core/events/events.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';

@Module({
  imports: [
    configModule,
    CoreModule,
    CqrsModule.forRoot(),
    RabbitMqModule,
    UserAccountsModule,
  ],
  imports: [
    configModule,
    PrismaModule,
    CoreModule,
    RabbitMqModule,
    CqrsModule.forRoot(),
    UserAccountsModule,
    EventsModule,
  ],
  controllers:
    process.env.NODE_ENV === 'testing'
      ? [AppController, TestController]
      : [AppController, RabbitMqTestController],
})
export class AppModule {}
