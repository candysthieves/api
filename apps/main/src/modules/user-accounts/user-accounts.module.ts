import { Module } from '@nestjs/common';
import { UsersController } from './users/user.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { UserService } from './users/application/user.service.js';
import { AuthService } from './auth/application/auth.service.js';
import { UsersRepository } from './users/repositories/users.repository.js';
import { UsersQueryRepository } from './users/repositories/users.query.repository.js';

const useCases = [];

@Module({
  imports: [],
  controllers: [UsersController, AuthController],
  providers: [
    ...useCases,
    UserService,
    AuthService,
    UsersRepository,
    UsersQueryRepository,
  ],
})
export class UserAccountsModule {}
