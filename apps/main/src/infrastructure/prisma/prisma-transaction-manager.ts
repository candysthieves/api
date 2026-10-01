import { Injectable } from '@nestjs/common';
import {
  TransactionClient,
  TransactionManager,
} from '../../core/database/transaction-manager.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback);
  }
}
