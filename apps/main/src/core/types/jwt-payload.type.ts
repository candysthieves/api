export type JwtRefreshPayload = {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
};
