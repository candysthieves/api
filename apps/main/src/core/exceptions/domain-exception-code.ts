export enum DomainExceptionCode {
  // Common
  NotFound = 1,
  BadRequest = 2,
  InternalServerError = 3,
  Forbidden = 4,
  ValidationError = 5,

  // Auth
  Unauthorized = 11,
  EmailNotConfirmed = 12,
  ConfirmationCodeExpired = 13,
  PasswordRecoveryCodeExpired = 14,
  InvalidRecoveryCode = 15,
}

export enum ErrorStatus {
  // Email
  EMAIL_ALREADY_CONFIRMED = 20,
  EMAIL_NOT_EXISTS = 21,
  EMAIL_NOT_CONFIRMED = 22,
  EMAIL_ALREADY_EXISTS = 23,

  // Username
  USERNAME_ALREADY_EXISTS = 30,
  USER_NOT_FOUND = 33,

  //Confirmation code
  CONFIRMATION_CODE_EXPIRED = 40,
  CONFIRMATION_CODE_INVALID = 41,

  //Recovery code
  RECOVERY_CODE_EXPIRED = 42,
  RECOVERY_CODE_INVALID = 43,

  VALIDATION_ERROR = 50,
  INVALID_CREDENTIALS = 51,
  RECAPTCHA_INVALID = 52,
  PASSWORDS_NOT_MATCH = 53,

  // Refresh token
  REFRESH_TOKEN_INVALID = 70,
  REFRESH_TOKEN_MISSING = 71,
  REFRESH_TOKEN_EXPIRED = 72,

  //Sessions
  SESSION_NOT_FOUND = 80,
  SESSION_USER_MISMATCH = 82,
  SESSION_ACCESS_FORBIDDEN = 83,
}
