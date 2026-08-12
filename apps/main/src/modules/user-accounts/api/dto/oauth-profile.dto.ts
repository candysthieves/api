import type { OAuthProvider } from '../../../../generated/prisma/client.js';

export class OAuthProfileDto {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
