// import type { UserModel } from '../../../../generated/prisma/models/User.js';
// type PrismaUser = UserModel;
//
// // type PrismaUser = {
// //   [K in keyof UserModel]: UserModel[K];
// // };
//
// export class UserEntity {
//   private readonly props: PrismaUser;
//   private constructor(
//     public readonly id: string,
//     public readonly email: string,
//     public readonly username: string,
//     public readonly passwordHash: string,
//     public isEmailConfirmed: boolean,
//     public readonly termsAcceptedAt: Date,
//     public readonly createdAt: Date,
//   ) {}
//
//   static create(data: {
//     email: string;
//     username: string;
//     passwordHash: string;
//   }): UserEntity {
//     return new UserEntity(
//       crypto.randomUUID(),
//       data.email,
//       data.username,
//       data.passwordHash,
//       false,
//       new Date(),
//       new Date(),
//     );
//   }
//   public toPersistence(): PrismaUser {
//     return { ...this.props };
//   }
//
//   static restore(prismaUser: UserModel): UserEntity {
//     // Приводим тип, чтобы TS не требовал аргументы конструктора UserModel
//     return new UserEntity(prismaUser);
//   }
//   // Бизнес-метод (например, подтверждение email)
//   public confirmEmail(): void {
//     this.isEmailConfirmed = true;
//   }
// }
import type { UserModel } from '../../../../generated/prisma/models/User.js';

// Забираем только типы полей класса UserModel, игнорируя его конструктор
type PrismaUser = {
  [K in keyof UserModel]: UserModel[K];
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
  }): UserEntity {
    return new UserEntity({
      id: crypto.randomUUID(),
      email: data.email,
      username: data.username,
      password: data.passwordHash,
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

  get username(): string {
    return this.props.username;
  }
}
