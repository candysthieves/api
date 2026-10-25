import { CompiledQuery, type Compilable, type Kysely } from 'kysely';
import type { PaymentDatabase } from './types/payment-database.type.js';

// Raw-команды драйвер отправляет через client.command, который дочитывает ответ.
// UpdateQueryNode использует client.query и оставляет ответ непрочитанным.
export async function executeMutation(
  db: Kysely<PaymentDatabase>,
  query: Compilable,
): Promise<void> {
  const compiled = query.compile();
  await db.executeQuery(
    CompiledQuery.raw(compiled.sql, [...compiled.parameters]),
  );
}
