export type JwtRefreshPayload = {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type JwtAccessPayload = {
  userId: string;
  iat: number;
  exp: number;
};
