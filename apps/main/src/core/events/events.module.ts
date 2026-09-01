import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PostMediaEventsService } from './post-media-events.service.js';
import { FilesTcpClient, FILES_TCP_CLIENT } from './files-tcp.client.js';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: FILES_TCP_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('FILES_TCP_HOST'),
            port: config.getOrThrow<number>('FILES_TCP_PORT'),
          },
        }),
      },
    ]),
  ],
  providers: [PostMediaEventsService, FilesTcpClient],
  exports: [FilesTcpClient, PostMediaEventsService],
})
export class EventsModule {}
