import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { OAuthAccountEntity } from '../../domain/entities/oauth-account.entity.js';

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

  async save(oAuthAccountEntity: OAuthAccountEntity) {
    await this.oauthAccountPrisma.update({
      where: {
        id: oAuthAccountEntity.id,
      },
      data: oAuthAccountEntity.toPersistence(),
    });
  }
}
