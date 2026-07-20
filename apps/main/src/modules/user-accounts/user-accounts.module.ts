import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { UsersController } from './users/user.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { UserService } from './users/application/user.service.js';
import { AuthService } from './auth/application/auth.service.js';
import { UsersRepository } from './users/repositories/users.repository.js';
import { UsersQueryRepository } from './users/repositories/users.query.repository.js';
import { RegistrationUseCase } from './auth/application/usecases/registration.usecase.js';

const useCases = [RegistrationUseCase];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController, AuthController],
  providers: [
    PrismaService,
    ...useCases,
    UserService,
    AuthService,
    UsersRepository,
    UsersQueryRepository,
  ],
})
export class UserAccountsModule {}
