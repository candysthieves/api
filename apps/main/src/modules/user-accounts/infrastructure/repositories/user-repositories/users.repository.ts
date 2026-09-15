import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { Prisma, User } from '../../../../../generated/prisma/client.js';
import {
  UserCreateInput,
  UserUpdateInput,
} from '../../../../../generated/prisma/models/User.js';

@Injectable()
export class UsersRepository {
  private readonly prismaUser: PrismaService['user'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaUser = prisma.user;
  }

  async create(
    data: UserCreateInput,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<User> {
    return client.user.create({ data });
  }

  async update(userId: string, data: UserUpdateInput): Promise<User> {
    return this.prismaUser.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async findByUsername(
    username: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<User | null> {
    return client.user.findUnique({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prismaUser.findUnique({ where: { email } });
  }

  async findByIdOrNotFound(id: string): Promise<User> {
    const user = await this.prismaUser.findFirst({ where: { id } });

    if (!user) {
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'userId',
        'User not found',
      );
    }

    return user;
  }

  async findByConfirmationCode(code: string): Promise<User | null> {
    return this.prismaUser.findFirst({
      where: {
        confirmationCode: code,
      },
    });
  }

  async findByPasswordRecoveryCode(code: string): Promise<User | null> {
    return this.prismaUser.findUnique({
      where: { passwordRecoveryCode: code },
    });
  }
}
