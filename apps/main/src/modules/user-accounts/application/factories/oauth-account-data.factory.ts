import { OAuthProvider } from '../../../../generated/prisma/enums.js';
import { Prisma } from '../../../../generated/prisma/client.js';

export class OAuthAccountDataFactory {
  static prepareCreateData(
    userId: number,
    provider: OAuthProvider,
    providerId: string,
    email: string,
  ): Prisma.OAuthAccountCreateInput {
    return {
      user: {
        connect: {
          id: userId,
        },
      },
      provider: provider,
      email: email,
      providerId: providerId,
    };
  }
}
