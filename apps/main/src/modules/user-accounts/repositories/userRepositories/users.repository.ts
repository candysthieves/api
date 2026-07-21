import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { UserEntity } from '../../domain/entities/user.entity.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<UserEntity | null> {
    const raw = await this.prismaService.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (!raw) {
      return null;
    }

    return UserEntity.restore(raw);
  }

  async save(user: UserEntity) {
    const data = user.toPersistence();

    return this.prismaService.user.create({ data });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prismaService.user.findUnique({ where: { email } });

    return user ? UserEntity.restore(user) : null;
  }
}
