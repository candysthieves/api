import type { INestApplication, INestMicroservice } from '@nestjs/common';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppConfig } from '../app.config.js';

export function setupTcp(app: INestApplication): INestMicroservice {
  const config = app.get(AppConfig);

  return app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.mainTcpHost,
      port: config.mainTcpPort,
    },
  });
}
