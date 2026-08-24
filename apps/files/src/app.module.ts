import { configModule } from './config.js';
import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesModule } from './modules/files/files.module.js';
import { CqrsModule } from '@nestjs/cqrs';
import { AppController } from './app.controller.js';

@Module({
  controllers: [AppController],
  imports: [
    CqrsModule.forRoot(),
    configModule,
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
