import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';

@Injectable()
export class UsersQueryRepository {
  private readonly prismaUser: PrismaService['user'];
  constructor(private readonly prisma: PrismaService) {
    this.prismaUser = prisma.user;
  }
  async findByIdOrNotFound(userId: string) {
    const user = await this.prismaUser.findUnique({ where: { id: userId } });

    if (!user) {
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'user',
        'User not found',
      );
    }

    return user;
  }

  async findByUsernameOrNotFound(username: string) {
    const user = await this.prismaUser.findUnique({ where: { username } });

    if (!user) {
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'user',
        'User not found',
      );
    }

    return user;
  }

  async getUsersCount(): Promise<number> {
    return this.prismaUser.count({
      where: { isEmailConfirmed: true },
    });
  }
}
