import { Prisma } from '../../generated/prisma/client.js';

export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');

export type TransactionClient = Prisma.TransactionClient;

export interface TransactionManager {
  run<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
}
