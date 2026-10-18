import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { configModule } from './config.js';
import { PaymentsConfig } from './payments.config.js';
import { DatabaseModule } from './database/database.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    configModule,
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    PaymentsModule,
  ],
  providers: [PaymentsConfig],
  exports: [PaymentsConfig],
})
export class AppModule {}
