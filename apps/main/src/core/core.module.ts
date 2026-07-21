import { Global, Module } from '@nestjs/common';
import { HashAdapter } from './adapters/hash.adapter.js';
import { JwtAdapter } from './adapters/jwt.adapter.js';
import { JwtModule } from '@nestjs/jwt';
import { CookieAdapter } from './adapters/cookie.adapter.js';

//глобальный модуль для провайдеров и модулей необходимых во всех частях приложения (например LoggerService, CqrsModule, etc...)
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [HashAdapter, JwtAdapter, CookieAdapter],
  exports: [JwtModule, HashAdapter, JwtAdapter, CookieAdapter],
})
export class CoreModule {}
