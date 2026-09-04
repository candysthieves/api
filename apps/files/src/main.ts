import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ApplicationLogger } from './core/logging/application-logger.js';
import { getRuntimeResources } from './core/logging/runtime-resources.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(
    JSON.stringify({
      event: 'runtime_resources_detected',
      ...(await getRuntimeResources()),
    }),
  );
  const app = await NestFactory.create(AppModule, {
    logger: new ApplicationLogger(),
  });

  const config = app.get(FilesConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.rabbitMqUrl],
      queue: config.rabbitMqMainToFilesQueue,
      noAck: false,
    },
  }, { inheritAppConfig: true });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: config.tcpHost,
      port: config.tcpPort,
    },
  }, { inheritAppConfig: true });

  await app.init();
  await app.startAllMicroservices();

  logger.log(JSON.stringify({ event: 'service_started', service: 'files', tcpHost: config.tcpHost, tcpPort: config.tcpPort }));
}
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal('Files service failed to start', error instanceof Error ? error.stack : undefined);
  process.exitCode = 1;
});
