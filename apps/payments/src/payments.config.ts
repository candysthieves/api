import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsConfig {
  readonly port: number;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
  }
}
