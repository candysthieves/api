import { Global, Module } from '@nestjs/common';
import { HashAdapter } from './adapters/hash.adapter.js';
import { JwtAdapter } from './adapters/jwt.adapter.js';
import { JwtModule } from '@nestjs/jwt';
import { CookieAdapter } from './adapters/cookie.adapter.js';
import { AppConfig } from '../app.config.js';
import { EmailAdapter } from './adapters/email/email.adapter.js';
import { RecaptchaService } from './services/recaptcha.service.js';

//глобальный модуль для провайдеров и модулей необходимых во всех частях приложения (например LoggerService, CqrsModule, etc...)
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    AppConfig,
    HashAdapter,
    JwtAdapter,
    CookieAdapter,
    EmailAdapter,
    RecaptchaService,
  ],
  exports: [
    AppConfig,
    JwtModule,
    HashAdapter,
    JwtAdapter,
    CookieAdapter,
    EmailAdapter,
    RecaptchaService,
  ],
})
export class CoreModule {}
