import { sql } from 'kysely';

/** Преобразует дату в SQL-выражение ClickHouse для запросов к таблицам подписок. */
export function clickhouseDateTime(value: Date) {
  return sql<Date>`parseDateTimeBestEffort(${value.toISOString()})`;
}
