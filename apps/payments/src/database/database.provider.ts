import { FactoryProvider, Logger } from '@nestjs/common';
import { ClickhouseDialect } from '@founderpath/kysely-clickhouse';
import { CamelCasePlugin, Kysely, sql } from 'kysely';
import { PaymentsConfig } from '../payments.config.js';
import { KYSELY_CLICKHOUSE } from './database.constants.js';
import { PaymentDatabase } from './types/payment-database.type.js';

export const databaseProvider: FactoryProvider<
  Promise<Kysely<PaymentDatabase>>
> = {
  provide: KYSELY_CLICKHOUSE,
  inject: [PaymentsConfig],
  useFactory: async (
    paymentsConfig: PaymentsConfig,
  ): Promise<Kysely<PaymentDatabase>> => {
    const logger = new Logger('DatabaseModule');

    const db = new Kysely<PaymentDatabase>({
      dialect: new ClickhouseDialect({
        options: {
          url: paymentsConfig.clickhouseHost,
          username: paymentsConfig.clickhouseUser,
          password: paymentsConfig.clickhousePassword,
          database: paymentsConfig.clickhouseDatabase,
        },
      }),
      plugins: [new CamelCasePlugin()],
    });

    try {
      // Проверяем реальное подключение к ClickHouse и существование базы данных
      await sql`SELECT 1`.execute(db);
      logger.log(
        `Successfully connected to ClickHouse database "${paymentsConfig.clickhouseDatabase}"`,
      );
      return db;
    } catch (error) {
      await db.destroy();
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      logger.fatal(
        `Failed to connect to ClickHouse database "${paymentsConfig.clickhouseDatabase}": ${message}`,
      );
      throw new Error(`ClickHouse connection failed: ${message}`);
    }
  },
};
