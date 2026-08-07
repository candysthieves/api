// import type { UserModel } from '../../../../generated/prisma/models/User.js';
import type { User } from '../../../../generated/prisma/client.js';
import { DomainExceptions } from '../../../../core/exceptions/domain-exceptions.js';

type PrismaUser = {
  [K in keyof User]: User[K];
};

export class UserEntity {
  private readonly props: PrismaUser;

  private constructor(props: PrismaUser) {
    this.props = props;
  }

  static create(
    email: string,
    username: string,
    passwordHash: string,
    confirmationExpiresAt: Date,
    isEmailConfirmed: boolean = false,
  ): UserEntity {
    return new UserEntity({
      id: crypto.randomUUID(),
      email: email,
      username: username,
      password: passwordHash,
      confirmationCode: crypto.randomUUID(),
      confirmationExpiresAt: confirmationExpiresAt,
      passwordRecoveryCode: null,
      passwordRecoveryExpiresAt: null,
      isEmailConfirmed: isEmailConfirmed,
      termsAcceptedAt: new Date(),
      createdAt: new Date(),
    });
  }

  public update(
    username: string,
    passwordHash: string,
    confirmationExpiresAt: Date,
    isEmailConfirmed: boolean = false,
  ): UserEntity {
    return new UserEntity({
      id: this.id,
      email: this.email,
      username: username,
      password: passwordHash,
      confirmationCode: crypto.randomUUID(),
      confirmationExpiresAt: confirmationExpiresAt,
      passwordRecoveryCode: null,
      passwordRecoveryExpiresAt: null,
      isEmailConfirmed: isEmailConfirmed,
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

  get confirmationCode(): string | null {
    return this.props.confirmationCode;
  }

  get isEmailConfirmed(): boolean {
    return this.props.isEmailConfirmed;
  }

  public confirmEmail(): void {
    if (this.props.isEmailConfirmed) {
      DomainExceptions.badRequest('email', 'Email already confirmed');
    }

    if (this.props.confirmationExpiresAt < new Date()) {
      DomainExceptions.badRequest('code', 'Confirmation code expired');
    }

    this.props.isEmailConfirmed = true;
    this.props.confirmationCode = null;
  }

  public resendEmail(confirmationExpiresAt: Date): void {
    if (this.props.isEmailConfirmed) {
      DomainExceptions.badRequest('email', 'Email already confirmed');
    }

    this.props.confirmationCode = crypto.randomUUID();
    this.props.confirmationExpiresAt = confirmationExpiresAt;
  }

  public createPasswordRecoveryCode(expiresAt: Date): void {
    this.props.passwordRecoveryCode = crypto.randomUUID();
    this.props.passwordRecoveryExpiresAt = expiresAt;
  }

  public isPasswordRecoveryCodeValid(code: string): boolean {
    return (
      this.props.passwordRecoveryCode === code &&
      this.props.passwordRecoveryExpiresAt !== null &&
      this.props.passwordRecoveryExpiresAt > new Date()
    );
  }

  public changePassword(passwordHash: string): void {
    this.props.password = passwordHash;
    this.props.passwordRecoveryCode = null;
    this.props.passwordRecoveryExpiresAt = null;
  }

  get passwordRecoveryCode(): string | null {
    return this.props.passwordRecoveryCode;
  }
}
