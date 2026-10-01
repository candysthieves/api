import { NestFactory } from '@nestjs/core';
import { FilesConfig } from './files.config.js';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });

  const config = app.get(FilesConfig);

  app.enableShutdownHooks();

  process.on('uncaughtException', (error: Error) => {
    logger.fatal('Uncaught exception', error.stack);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal(
      'Unhandled rejection',
      reason instanceof Error ? reason.stack : String(reason),
    );
  });

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

  const startupInfo = [`Port:    ${config.tcpPort}`, 'MongoDB: connected'];
  const width = Math.max(...startupInfo.map((line) => line.length));
  console.log(
    [
      '',
      `┌${'─'.repeat(width + 2)}┐`,
      ...startupInfo.map((line) => `│ ${line.padEnd(width)} │`),
      `└${'─'.repeat(width + 2)}┘`,
      '',
    ].join('\n'),
  );
}
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(
    'Files service failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
