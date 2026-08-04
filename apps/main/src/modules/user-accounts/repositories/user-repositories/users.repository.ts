import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { UserEntity } from '../../domain/entities/user.entity.js';

@Injectable()
export class UsersRepository {
  private readonly prismaUser: PrismaService['user'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaUser = prisma.user;
  }

  async findByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<UserEntity | null> {
    const raw = await this.prismaUser.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (!raw) {
      return null;
    }

    return UserEntity.restore(raw);
  }

  async create(userEntity: UserEntity) {
    const data = userEntity.toPersistence();

    return this.prismaUser.create({ data });
  }

  async save(userEntity: UserEntity) {
    await this.prismaUser.update({
      where: {
        id: userEntity.id,
      },
      data: userEntity.toPersistence(),
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prismaUser.findUnique({ where: { email } });

    return user ? UserEntity.restore(user) : null;
  }
  async findByConfirmationCode(code: string) {
    return this.prismaUser.findFirst({
      where: {
        confirmationCode: code,
      },
    });
  }

  async findByPasswordRecoveryCode(code: string): Promise<UserEntity | null> {
    const user = await this.prismaUser.findUnique({
      where: { passwordRecoveryCode: code },
    });
    return user ? UserEntity.restore(user) : null;
  }
}
