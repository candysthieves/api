import { Module } from '@nestjs/common';
import { NotificationsController } from './api/notifications.controller.js';

const queryHandlers: any[] = [];
const useCases: any[] = [];

@Module({
  imports: [],
  controllers: [NotificationsController],
  providers: [...queryHandlers, ...useCases],
})
export class NotificationsModule {}
