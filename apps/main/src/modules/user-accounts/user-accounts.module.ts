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

const useCases = [
  RegistrationUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
];
const queryHandlers = [FindAllSessionsQueryHandler];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController, AuthController, SessionsController],
  providers: [
    PrismaService,
    ...useCases,
    ...queryHandlers,
    UsersService,
    AuthService,
    UsersRepository,
    UsersQueryRepository,
    SessionsRepository,
    SessionsQueryRepository,
  ],
})
export class UserAccountsModule {}
