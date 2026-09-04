import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import { setupApp } from './setup/app-setup.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { HttpHandlerLoggingInterceptor } from './core/logging/http-handler-logging.interceptor.js';
import { getRuntimeResources } from './core/logging/runtime-resources.js';
import { ApplicationLogger } from './core/logging/application-logger.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log(
    JSON.stringify({
      event: 'runtime_resources_detected',
      ...(await getRuntimeResources()),
    }),
  );
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ApplicationLogger(),
  });
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
