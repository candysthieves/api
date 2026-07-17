export const isProdHelper = (): boolean =>
  (process.env.NODE_ENV || 'production') === 'production';
