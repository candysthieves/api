import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PaymentsConfig } from './payments.config.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RpcErrorToResponseFilter } from './core/filters/rpc-error-to-response.filter.js';
import { RpcRequestValidationPipe } from './core/pipes/rpc-request-validation.pipe.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });

  const config = app.get(PaymentsConfig);
  const port = config.port;

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

  app.useGlobalFilters(new RpcErrorToResponseFilter());
  app.useGlobalPipes(RpcRequestValidationPipe());

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: { host: config.tcpHost, port: config.tcpPort },
    },
    { inheritAppConfig: true },
  );

  await app.listen(port);
  await app.startAllMicroservices();

  const startupInfo = [
    `Port: ${port}`,
    `TCP: ${config.tcpHost}:${config.tcpPort}`,
    'ClickHouse: connected',
  ];
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
    'Payments service failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});

