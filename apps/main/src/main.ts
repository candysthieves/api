import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AppConfig } from './app.config.js';
import { setupApp } from './setup/app-setup.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get<AppConfig>(AppConfig);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [appConfig.rabbitMqUrl],
      queue: appConfig.rabbitMqFilesToMainQueue,
      noAck: false,
    },
  });

  setupApp(app);

  await app.startAllMicroservices();
  await app.listen(appConfig.port);
  console.log('Server started on port: ' + appConfig.port);
}
bootstrap();
