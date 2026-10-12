import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { PaymentsConfig } from './payments.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = app.get(PaymentsConfig).port;
  await app.listen(port);

  const startupInfo = [`Port: ${port}`];
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
bootstrap();
