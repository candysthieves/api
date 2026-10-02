import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/prisma/prisma.service.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import {
  City,
  Country,
  Prisma,
  User,
} from '../../../../../generated/prisma/client.js';
import { getFileIds } from '../../../../../core/events/files-tcp.service.js';
import {
  UserCreateInput,
  UserUncheckedUpdateInput,
  UserUpdateInput,
} from '../../../../../generated/prisma/models/User.js';
import type { MediaFile } from '../../../../../../../../libs/contracts/index.js';

export type UserWithLocations = User & {
  country: Country | null;
  city: City | null;
};

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

  async update(
    userId: number,
    data: UserUpdateInput | UserUncheckedUpdateInput,
  ): Promise<User> {
    return this.prismaUser.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async updateAvatar(
    userId: number,
    image: MediaFile,
    preview: MediaFile,
  ): Promise<boolean> {
    const imageJson = JSON.stringify(image);
    const previewJson = JSON.stringify(preview);
    const count = await this.prisma.$executeRaw`
      UPDATE "User"
      SET avatar = ${imageJson}::jsonb,
          avatar_preview = ${previewJson}::jsonb,
          updated_at = NOW()
      WHERE id = ${userId}
        AND (avatar IS DISTINCT FROM ${imageJson}::jsonb OR avatar_preview IS DISTINCT FROM ${previewJson}::jsonb)
    `;
    return count === 1;
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

  async findByIdOrNotFound(id: number): Promise<User> {
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

  async findForDeletion(id: number) {
    return this.prismaUser.findUnique({
      where: { id },
      select: {
        id: true,
        avatar: true,
        avatarPreview: true,
        posts: { select: { images: true, preview: true } },
      },
    });
  }

  async findAllForDeletion() {
    return this.prismaUser.findMany({
      select: {
        id: true,
        avatar: true,
        avatarPreview: true,
        posts: { select: { images: true, preview: true } },
      },
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.prismaUser.delete({ where: { id } });
  }

  async findByIdWithLocationsOrNotFound(
    id: number,
  ): Promise<UserWithLocations> {
    const user = await this.prismaUser.findFirst({
      where: { id },
      include: {
        country: true,
        city: true,
      },
    });

    if (!user) {
      DomainExceptions.notFound(
        ErrorStatus.USER_NOT_FOUND,
        'userId',
        'User not found',
      );
    }

    return user;
  }

  async getAllActiveAvatarFileIds(): Promise<string[]> {
    const users = await this.prismaUser.findMany({
      select: { avatar: true, avatarPreview: true },
    });
    const ids = new Set<string>();
    for (const user of users)
      for (const id of [
        ...getFileIds(user.avatar),
        ...getFileIds(user.avatarPreview),
      ])
        ids.add(id);
    return [...ids];
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
