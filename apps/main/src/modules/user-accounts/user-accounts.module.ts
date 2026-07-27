import { CqrsModule } from '@nestjs/cqrs';
import { UsersService } from './application/users.service.js';
import { RegistrationUseCase } from './application/use-cases/auth-use-cases/registration.usecase.js';
import { LoginUseCase } from './application/use-cases/auth-use-cases/login.usecase.js';
import { Module } from '@nestjs/common';
import { UsersController } from './api/user.controller.js';
import { AuthController } from './api/auth.controller.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuthService } from './application/auth.service.js';
import { UsersRepository } from './repositories/userRepositories/users.repository.js';
import { UsersQueryRepository } from './repositories/userRepositories/users.query.repository.js';
import { SessionsRepository } from './repositories/sessionRepositories/sessions.repository.js';
import { SessionsQueryRepository } from './repositories/sessionRepositories/sessions.queryRepository.js';
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
];
const queryHandlers = [FindAllSessionsQueryHandler];
const repositories = [UsersRepository, SessionsRepository];
const queryRepositories = [SessionsQueryRepository, UsersQueryRepository];
const services = [
  PrismaService,
  UsersService,
  AuthService,
  PasswordRecoveryService,
];
const controllers = [UsersController, AuthController, SessionsController];

@Module({
  imports: [CqrsModule],
  controllers: [...controllers],
  providers: [
    ...useCases,
    ...queryHandlers,
    ...repositories,
    ...queryRepositories,
    ...services,
  ],
})
export class UserAccountsModule {}
