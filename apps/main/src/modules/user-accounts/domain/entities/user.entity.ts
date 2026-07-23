// import type { UserModel } from '../../../../generated/prisma/models/User.js';
import type { User } from '../../../../generated/prisma/client.js';
import { BadRequestException } from '@nestjs/common';

// Забираем только типы полей класса UserModel, игнорируя его конструктор
type PrismaUser = {
  [K in keyof User]: User[K];
};

export class UserEntity {
  private readonly props: PrismaUser;

  private constructor(props: PrismaUser) {
    this.props = props;
  }

  static create(data: {
    email: string;
    username: string;
    passwordHash: string;
    confirmationExpiresAt: Date;
  }): UserEntity {
    return new UserEntity({
      id: crypto.randomUUID(),
      email: data.email,
      username: data.username,
      password: data.passwordHash,
      confirmationCode: crypto.randomUUID(),
      confirmationExpiresAt: data.confirmationExpiresAt,
      isEmailConfirmed: false,
      termsAcceptedAt: new Date(),
      createdAt: new Date(),
    });
  }

  static restore(prismaUser: PrismaUser): UserEntity {
    return new UserEntity(prismaUser);
  }

  public toPersistence(): PrismaUser {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get username(): string {
    return this.props.username;
  }

  get confirmationCode(): string {
    return this.props.confirmationCode;
  }

  get isEmailConfirmed(): boolean {
    return this.props.isEmailConfirmed;
  }

  public confirmEmail(): void {
    if (this.props.isEmailConfirmed) {
      throw new BadRequestException('Email already confirmed');
    }

    if (this.props.confirmationExpiresAt < new Date()) {
      throw new BadRequestException('Confirmation code expired');
    }

    this.props.isEmailConfirmed = true;
    this.props.confirmationCode = '';
  }
}
