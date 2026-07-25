import type { Session } from '../../../../generated/prisma/client.js';

type PrismaSession = {
  [K in keyof Session]: Session[K];
};

export class SessionEntity {
  private readonly props: PrismaSession;

  private constructor(props: PrismaSession) {
    this.props = props;
  }

  static create(data: {
    userId: string;
    deviceName: string;
    ip: string;
    lifetimeMs: number;
  }): SessionEntity {
    return new SessionEntity({
      id: crypto.randomUUID(),
      userId: data.userId,
      deviceName: data.deviceName,
      ip: data.ip,
      issuedAt: new Date(),
      expiresAt: new Date(new Date().getTime() + data.lifetimeMs),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }

  static restore(prismaSession: PrismaSession): SessionEntity {
    return new SessionEntity(prismaSession);
  }

  public toPersistence(): PrismaSession {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get deviceName(): string {
    return this.props.deviceName;
  }

  get ip(): string {
    return this.props.ip;
  }

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
}
