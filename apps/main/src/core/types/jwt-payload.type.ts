export type JwtRefreshPayload = {
  userId: number;
  sessionId: string;
  iat: number;
  exp: number;
};

export type JwtAccessPayload = {
  userId: number;
  iat: number;
  exp: number;
};
