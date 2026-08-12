import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { OAuthAccountEntity } from '../../../domain/entities/oauth-account.entity.js';
import { OAuthProvider } from '../../../../../generated/prisma/client.js';

@Injectable()
export class OAuthRepository {
  private readonly oauthAccountPrisma: PrismaService['oAuthAccount'];

  constructor(private readonly prisma: PrismaService) {
    this.oauthAccountPrisma = prisma.oAuthAccount;
  }

  async create(oAuthAccountEntity: OAuthAccountEntity) {
    const data = oAuthAccountEntity.toPersistence();

    return this.oauthAccountPrisma.create({ data });
  }

  async save(oAuthAccountEntity: OAuthAccountEntity): Promise<void> {
    await this.oauthAccountPrisma.update({
      where: {
        id: oAuthAccountEntity.id,
      },
      data: oAuthAccountEntity.toPersistence(),
    });
  }

  async findByProvider(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<OAuthAccountEntity | null> {
    const existProvider = await this.oauthAccountPrisma.findUnique({
      where: { providerId_provider: { providerId, provider } },
    });

    return existProvider ? OAuthAccountEntity.restore(existProvider) : null;
  }

  async findByUserId(userId: string): Promise<OAuthAccountEntity | null> {
    const existProvider = await this.oauthAccountPrisma.findFirst({
      where: { userId: userId },
    });

    return existProvider ? OAuthAccountEntity.restore(existProvider) : null;
  }
}
