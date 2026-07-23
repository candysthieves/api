export type JwtPayload = {
  userId: string;
  iat?: number;
  exp?: number;
};

export type JwtRefreshPayload = {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
};

export type AuthUser = JwtPayload | JwtRefreshPayload;
