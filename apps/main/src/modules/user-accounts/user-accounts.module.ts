import { CqrsModule } from '@nestjs/cqrs';
import { RegistrationUseCase } from './application/use-cases/auth-use-cases/registration.usecase.js';
import { LoginUseCase } from './application/use-cases/auth-use-cases/login.usecase.js';
import { Module } from '@nestjs/common';
import { UsersController } from './api/users.controller.js';
import { AuthController } from './api/auth.controller.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { UsersRepository } from './infrastructure/repositories/user-repositories/users.repository.js';
import { UsersQueryRepository } from './infrastructure/repositories/user-repositories/users.query.repository.js';
import { SessionsRepository } from './infrastructure/repositories/session-repositories/sessions.repository.js';
import { SessionsQueryRepository } from './infrastructure/repositories/session-repositories/sessions.query.repository.js';
import { SessionsController } from './api/sessions.controller.js';
import { FindAllSessionsQueryHandler } from './application/query-handler/sessions/find-sessions-query-handler.js';
import { LogoutUseCase } from './application/use-cases/auth-use-cases/logout.usecase.js';
import { RefreshTokenUseCase } from './application/use-cases/auth-use-cases/refresh-token,usecase.js';
import { DeleteOtherSessionsUseCase } from './application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';
import { DeactivateSessionUseCase } from './application/use-cases/sessions-use-cases/deactivate-session.usecase.js';
import { ConfirmEmailUseCase } from './application/use-cases/auth-use-cases/confirm-email.usecase.js';
import { ResendEmailUseCase } from './application/use-cases/auth-use-cases/resend-email.usecase.js';
import { PasswordRecoveryUseCase } from './application/use-cases/auth-use-cases/password-recovery.usecase.js';
import { ValidatePasswordRecoveryCodeUseCase } from './application/use-cases/auth-use-cases/validate-password-recovery-code.usecase.js';
import { NewPasswordUseCase } from './application/use-cases/auth-use-cases/new-password.usecase.js';
import { PasswordRecoveryService } from './application/password-recovery.service.js';
import { OAuthLoginUseCase } from './application/use-cases/auth-use-cases/oauth-login.usecase.js';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy.js';
import { GithubStrategy } from './infrastructure/strategies/github.strategy.js';
import { OAuthRepository } from './infrastructure/repositories/oauth-repositories/oauth.repository.js';
import { AuthSessionService } from './application/auth-session.service.js';
import { GoogleOAuthLoginUseCase } from './application/use-cases/auth-use-cases/google-oauth-login.usecase.js';
import { GithubOAuthLoginUseCase } from './application/use-cases/auth-use-cases/github-oauth-login.usecase.js';
import { ProfileQueryHandler } from './application/query-handler/auth/profile.usecase.js';
import { GetUsersCountQueryHandler } from './application/query-handler/users/get-users-count-query-handler.js';

const useCases = [
  RegistrationUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  DeleteOtherSessionsUseCase,
  DeactivateSessionUseCase,
  ConfirmEmailUseCase,
  ResendEmailUseCase,
  PasswordRecoveryUseCase,
  ValidatePasswordRecoveryCodeUseCase,
  NewPasswordUseCase,
  OAuthLoginUseCase,
  GoogleOAuthLoginUseCase,
  GithubOAuthLoginUseCase,
];
const queryHandlers = [
  FindAllSessionsQueryHandler,
  ProfileQueryHandler,
  GetUsersCountQueryHandler,
];
const repositories = [UsersRepository, SessionsRepository, OAuthRepository];
const queryRepositories = [SessionsQueryRepository, UsersQueryRepository];
const services = [PrismaService, AuthSessionService, PasswordRecoveryService];
const controllers = [UsersController, AuthController, SessionsController];

const strategies = [GoogleStrategy, GithubStrategy];

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [
    ...useCases,
    ...queryHandlers,
    ...repositories,
    ...queryRepositories,
    ...services,
    ...strategies,
  ],
  exports: [PrismaService],
})
export class UserAccountsModule {}
