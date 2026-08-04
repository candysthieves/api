import type {
  OAuthAccount,
  OAuthProvider,
} from '../../../../generated/prisma/client.js';

type PrismaOAuthAccount = {
  [K in keyof OAuthAccount]: OAuthAccount[K];
};

export class OAuthAccountEntity {
  private readonly props: PrismaOAuthAccount;

  private constructor(props: PrismaOAuthAccount) {
    this.props = props;
  }

  static create(data: {
    userId: string;
    provider: OAuthProvider;
    providerId: string;
  }): OAuthAccountEntity {
    return new OAuthAccountEntity({
      id: crypto.randomUUID(),
      userId: data.userId,
      provider: data.provider,
      providerId: data.providerId,
      createdAt: new Date(),
    });
  }

  static restore(prismaOAuthAccount: PrismaOAuthAccount): OAuthAccountEntity {
    return new OAuthAccountEntity(prismaOAuthAccount);
  }

  public toPersistence(): PrismaOAuthAccount {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get provider(): OAuthProvider {
    return this.props.provider;
  }

  get providerId(): string {
    return this.props.providerId;
  }
}
