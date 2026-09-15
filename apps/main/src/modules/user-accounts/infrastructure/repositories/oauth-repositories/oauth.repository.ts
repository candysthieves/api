import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import {
  OAuthAccount,
  OAuthProvider,
  Prisma,
} from '../../../../../generated/prisma/client.js';
import {
  OAuthAccountCreateInput,
  OAuthAccountUpdateInput,
} from '../../../../../generated/prisma/models/OAuthAccount.js';

@Injectable()
export class OAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: OAuthAccountCreateInput,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<OAuthAccount> {
    return client.oAuthAccount.create({ data });
  }

  async update(
    id: string,
    data: OAuthAccountUpdateInput,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await client.oAuthAccount.update({
      where: {
        id: id,
      },
      data: data,
    });
  }

  async findByProvider(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<OAuthAccount | null> {
    return this.prisma.oAuthAccount.findUnique({
      where: { providerId_provider: { providerId, provider } },
    });
  }

  async findByUserId(userId: string): Promise<OAuthAccount | null> {
    return this.prisma.oAuthAccount.findFirst({
      where: { userId: userId },
    });
  }
}
