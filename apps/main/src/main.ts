import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import { setupApp } from './setup/app-setup.js';
import { Logger } from '@nestjs/common';
import { MainRabbitMqProducerService } from './core/rabbitmq/main-rabbitmq-producer.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);

  setupApp(app);

  await app.listen(appConfig.port);
  const rabbitConnected = await app
    .get(MainRabbitMqProducerService)
    .checkConnection();
  const startupInfo = [
    `Port:       ${appConfig.port}`,
    'PostgreSQL: connected',
    `RabbitMQ:   ${rabbitConnected ? 'connected' : 'unavailable'}`,
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
    'Main service failed to start',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
