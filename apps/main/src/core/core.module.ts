import { Global, Module } from '@nestjs/common';
import { HashAdapter } from './adapters/hash.adapter.js';
import { JwtAdapter } from './adapters/jwt.adapter.js';
import { JwtModule } from '@nestjs/jwt';
import { CookieAdapter } from './adapters/cookie.adapter.js';
import { AppConfig } from '../app.config.js';
import { EmailAdapter } from './adapters/email/email.adapter.js';
import { RecaptchaService } from './services/recaptcha.service.js';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module.js';
import { SeeController } from './sse/sse.controller.js';
import { SseService } from './sse/sse.service.js';

//глобальный модуль для провайдеров и модулей необходимых во всех частях приложения (например LoggerService, CqrsModule, etc...)
@Global()
@Module({
  imports: [JwtModule.register({}), RabbitMqModule],
  controllers: [SeeController],
  providers: [
    AppConfig,
    HashAdapter,
    JwtAdapter,
    CookieAdapter,
    EmailAdapter,
    RecaptchaService,
    SseService,
  ],
  exports: [
    AppConfig,
    JwtModule,
    HashAdapter,
    JwtAdapter,
    CookieAdapter,
    EmailAdapter,
    RecaptchaService,
    SseService,
  ],
})
export class CoreModule {}
