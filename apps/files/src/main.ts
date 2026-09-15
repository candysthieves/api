import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(FilesConfig);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: config.tcpHost,
        port: config.tcpPort,
      },
    },
    { inheritAppConfig: true },
  );

  await app.init();
  await app.startAllMicroservices();

  logger.log(`Files service started on ${config.tcpHost}:${config.tcpPort}`);
}
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(
    'Files service failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
