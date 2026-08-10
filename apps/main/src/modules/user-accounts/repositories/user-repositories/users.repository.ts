import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { UserEntity } from '../../domain/entities/user.entity.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class UsersRepository {
  private readonly prismaUser: PrismaService['user'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaUser = prisma.user;
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

  // async findByEmailOrUsername(
  //   email: string,
  //   username: string,
  // ): Promise<UserEntity | null> {
  //   const raw = await this.prismaUser.findFirst({
  //     where: {
  //       OR: [{ email }, { username }],
  //     },
  //   });
  //
  //   if (!raw) {
  //     return null;
  //   }
  //
  //   return UserEntity.restore(raw);
  // }

  async findByUsername(username: string) {
    const user = await this.prismaUser.findUnique({ where: { username } });

    return user ? UserEntity.restore(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prismaUser.findUnique({ where: { email } });

    return user ? UserEntity.restore(user) : null;
  }

  async findByIdOrNotFound(id: string): Promise<UserEntity> {
    const user = await this.prismaUser.findFirst({ where: { id } });

    if (!user) {
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'userId',
        'User not found',
      );
    }

    return UserEntity.restore(user);
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
