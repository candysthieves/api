import type { Prisma } from '../../../generated/prisma/client.js';
import type { InboxEvent } from '../../../generated/prisma/client.js';

export interface EventRepository {
  findMany(args: {
    where?: Prisma.InboxEventWhereInput & Prisma.OutputEventWhereInput;
    orderBy?: Prisma.InboxEventOrderByWithRelationInput;
    take?: number;
  }): Promise<InboxEvent[]>;
  updateMany(
    args: Prisma.InboxEventUpdateManyArgs & Prisma.OutputEventUpdateManyArgs,
  ): Promise<{ count: number }>;
}
