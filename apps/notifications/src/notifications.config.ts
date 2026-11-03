import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsConfig {
  readonly port: number;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
  }
}
