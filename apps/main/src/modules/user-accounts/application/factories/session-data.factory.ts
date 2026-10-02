import { Prisma } from '../../../../generated/prisma/client.js';

export class SessionDataFactory {
  static prepareCreateData(
    userId: number,
    deviceName: string,
    ip: string,
    lifetimeMs: number,
  ): Prisma.SessionCreateInput {
    const now = new Date();

    return {
      user: {
        connect: {
          id: userId,
        },
      },
      deviceName: deviceName,
      ip: ip,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + lifetimeMs),
    };
  }
}
