import { Global, Module } from '@nestjs/common';
import { HashAdapter } from './adapters/hash.adapter.js';

//глобальный модуль для провайдеров и модулей необходимых во всех частях приложения (например LoggerService, CqrsModule, etc...)
@Global()
@Module({
  providers: [HashAdapter],
  exports: [HashAdapter],
})
export class CoreModule {}
