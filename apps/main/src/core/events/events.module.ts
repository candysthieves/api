import { EventStoreService } from './event-store.service.js';
import { ImageOutboxService } from './image-outbox.service.js';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ImageResultInboxService } from './image-result-inbox.service.js';
import { FilesTcpClient, FILES_TCP_CLIENT } from './files-tcp.client.js';
import { PostImagesRepository } from './post-images.repository.js';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module.js';
import { ImageResultInboxConsumer } from './image-result-inbox.consumer.js';
import { AvatarImageResultInboxConsumer } from './avatar-image-result-inbox.consumer.js';
import { AvatarImagesRepository } from './avatar-images.repository.js';

@Module({
  imports: [
    RabbitMqModule,
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
  providers: [
    EventStoreService,
    ImageOutboxService,
    ImageResultInboxService,
    FilesTcpClient,
    PostImagesRepository,
    ImageResultInboxConsumer,
    AvatarImageResultInboxConsumer,
    AvatarImagesRepository,
  ],
  exports: [
    ImageOutboxService,
    FilesTcpClient,
    ImageResultInboxService,
    PostImagesRepository,
    RabbitMqModule,
  ],
})
export class EventsModule {}
