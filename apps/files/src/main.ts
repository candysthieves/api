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
  app.enableShutdownHooks();

  process.on('uncaughtException', (err: Error) => {
    logger.fatal(
      JSON.stringify({
        event: 'uncaught_exception',
        error: err.message,
        stack: err.stack,
        memoryUsage: process.memoryUsage(),
      }),
    );
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal(
      JSON.stringify({
        event: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        memoryUsage: process.memoryUsage(),
      }),
    );
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      logger.warn(
        JSON.stringify({
          event: 'process_signal_received',
          signal,
          memoryUsage: process.memoryUsage(),
        }),
      );
    });
  }

  setInterval(() => {
    const mem = process.memoryUsage();
    logger.log(
      JSON.stringify({
        event: 'files_heartbeat_memory',
        rssMiB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMiB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMiB: Math.round(mem.heapTotal / 1024 / 1024),
        externalMiB: Math.round(mem.external / 1024 / 1024),
      }),
    );
  }, 30_000).unref();

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
