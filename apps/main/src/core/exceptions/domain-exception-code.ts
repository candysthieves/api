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

  // Users
  UserAlreadyExists = 21,
  UserAlreadyConfirmed = 22,
}
