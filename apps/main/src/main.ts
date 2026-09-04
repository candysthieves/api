import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import { setupApp } from './setup/app-setup.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { HttpHandlerLoggingInterceptor } from './core/logging/http-handler-logging.interceptor.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [appConfig.rabbitMqUrl],
      queue: appConfig.rabbitMqFilesToMainQueue,
      noAck: false,
    },
  }, { inheritAppConfig: true });

  setupApp(app);
  app.useGlobalInterceptors(new HttpHandlerLoggingInterceptor());

  await app.startAllMicroservices();
  await app.listen(appConfig.port);
  logger.log(JSON.stringify({ event: 'service_started', service: 'main', port: appConfig.port }));
}
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal('Main service failed to start', error instanceof Error ? error.stack : undefined);
  process.exitCode = 1;
});
