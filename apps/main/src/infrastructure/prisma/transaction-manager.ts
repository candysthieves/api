import { Prisma } from '../../generated/prisma/client.js';

// Токен для внедрения менеджера транзакций через NestJS.
export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');

// Клиент Prisma для запросов внутри транзакции.
export type TransactionClient = Prisma.TransactionClient;

// Контракт запуска набора запросов в одной транзакции.
export interface TransactionManager {
  // При ошибке в callback все изменения транзакции откатываются.
  run<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
