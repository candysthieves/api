export type JwtPayload = {
  userId: string;
  iat?: number;
  exp?: number;
};

export type JwtRefreshPayload = {
  userId: string;
  iat: number;
  exp: number;
};
