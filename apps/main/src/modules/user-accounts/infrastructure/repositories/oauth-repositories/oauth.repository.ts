import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import {
  OAuthAccount,
  OAuthProvider,
} from '../../../../../generated/prisma/client.js';
import {
  OAuthAccountCreateInput,
  OAuthAccountUpdateInput,
} from '../../../../../generated/prisma/models/OAuthAccount.js';

@Injectable()
export class OAuthRepository {
  private readonly oauthAccountPrisma: PrismaService['oAuthAccount'];

  constructor(private readonly prisma: PrismaService) {
    this.oauthAccountPrisma = prisma.oAuthAccount;
  }

  async create(data: OAuthAccountCreateInput): Promise<OAuthAccount> {
    return this.oauthAccountPrisma.create({ data });
  }

  async update(id: string, data: OAuthAccountUpdateInput): Promise<void> {
    await this.oauthAccountPrisma.update({
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
    return this.oauthAccountPrisma.findUnique({
      where: { providerId_provider: { providerId, provider } },
    });
  }

  async findByUserId(userId: string): Promise<OAuthAccount | null> {
    return this.oauthAccountPrisma.findFirst({
      where: { userId: userId },
    });
  }
}
