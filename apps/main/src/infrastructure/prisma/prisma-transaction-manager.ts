import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';
import {
  TransactionClient,
  TransactionManager,
} from './transaction-manager.js';

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
