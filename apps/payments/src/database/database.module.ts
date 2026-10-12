import { Global, Module } from '@nestjs/common';
import { PaymentsConfig } from '../payments.config.js';
import { KYSELY_CLICKHOUSE } from './database.constants.js';
import { databaseProvider } from './database.provider.js';

@Global()
@Module({
  providers: [PaymentsConfig, databaseProvider],
  exports: [PaymentsConfig, KYSELY_CLICKHOUSE],
})
export class DatabaseModule {}
