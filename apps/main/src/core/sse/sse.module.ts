import { Module } from '@nestjs/common';
import { SeeController } from './sse.controller.js';
import { SseService } from './sse.service.js';

@Module({
  controllers: [SeeController],
  providers: [SseService],
})
export class SseModule {}
