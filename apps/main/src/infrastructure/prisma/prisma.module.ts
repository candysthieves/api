import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PrismaTransactionManager } from './prisma-transaction-manager.js';
import { TRANSACTION_MANAGER } from '../../core/database/transaction-manager.js';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionManager,
    {
      provide: TRANSACTION_MANAGER,
      useExisting: PrismaTransactionManager,
    },
  ],
  exports: [PrismaService, TRANSACTION_MANAGER],
})
export class PrismaModule {}
