import { configModule } from './config.js';
import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesModule } from './modules/files/files.module.js';
import { CqrsModule } from '@nestjs/cqrs';
import { AppController } from './app.controller.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  controllers: [AppController],
  imports: [
    configModule,
    ScheduleModule.forRoot(),
    CqrsModule.forRoot(),
    FilesModule,

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
  ],
})
export class AppModule {}
