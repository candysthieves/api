import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventsModule } from '../../core/events/events.module.js';
import { AuthSessionService } from './application/auth-session.service.js';
import { PasswordRecoveryService } from './application/password-recovery.service.js';
import { PostDeletionSchedulerService } from './application/post-deletion-scheduler.service.js';
import { ProfileQueryHandler } from './application/query-handler/auth/profile-query-handler.js';
import { FindAllSessionsQueryHandler } from './application/query-handler/sessions/find-sessions-query-handler.js';
import { GetUsersCountQueryHandler } from './application/query-handler/users/get-users-count-query-handler.js';
import { ConfirmEmailUseCase } from './application/use-cases/auth-use-cases/confirm-email.usecase.js';
import { GithubOAuthLoginUseCase } from './application/use-cases/auth-use-cases/github-oauth-login.usecase.js';
import { GoogleOAuthLoginUseCase } from './application/use-cases/auth-use-cases/google-oauth-login.usecase.js';
import { LoginUseCase } from './application/use-cases/auth-use-cases/login.usecase.js';
import { LogoutUseCase } from './application/use-cases/auth-use-cases/logout.usecase.js';
import { NewPasswordUseCase } from './application/use-cases/auth-use-cases/new-password.usecase.js';
import { OAuthLoginUseCase } from './application/use-cases/auth-use-cases/oauth-login.usecase.js';
import { PasswordRecoveryUseCase } from './application/use-cases/auth-use-cases/password-recovery.usecase.js';
import { RefreshTokenUseCase } from './application/use-cases/auth-use-cases/refresh-token,usecase.js';
import { RegistrationUseCase } from './application/use-cases/auth-use-cases/registration.usecase.js';
import { ResendEmailUseCase } from './application/use-cases/auth-use-cases/resend-email.usecase.js';
import { ValidatePasswordRecoveryCodeUseCase } from './application/use-cases/auth-use-cases/validate-password-recovery-code.usecase.js';
import { CreatePostUseCase } from './application/use-cases/posts-use-cases/create-post.use.case.js';
import { DeletePostUseCase } from './application/use-cases/posts-use-cases/delete-post.usecase.js';
import { DeactivateSessionUseCase } from './application/use-cases/sessions-use-cases/deactivate-session.usecase.js';
import { DeleteOtherSessionsUseCase } from './application/use-cases/sessions-use-cases/delete-other-sessions-use.case.js';
import { AuthController } from './api/auth.controller.js';
import { AccessTokenGuard } from './api/guards/access-token.guard.js';
import { PostController } from './api/post.controller.js';
import { SessionsController } from './api/sessions.controller.js';
import { UsersController } from './api/users.controller.js';
import { OAuthRepository } from './infrastructure/repositories/oauth-repositories/oauth.repository.js';
import { PostsRepository } from './infrastructure/repositories/post-repositories/posts.repository.js';
import { SessionsQueryRepository } from './infrastructure/repositories/session-repositories/sessions.query.repository.js';
import { SessionsRepository } from './infrastructure/repositories/session-repositories/sessions.repository.js';
import { UsersQueryRepository } from './infrastructure/repositories/user-repositories/users.query.repository.js';
import { UsersRepository } from './infrastructure/repositories/user-repositories/users.repository.js';
import { GithubStrategy } from './infrastructure/strategies/github.strategy.js';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy.js';
import { GetUserProfileQueryHandler } from './application/query-handler/users/get-user-profile-query-handler.js';
import { PostsQueryRepository } from './infrastructure/repositories/post-repositories/posts.query.repository.js';
import { GetPostsQueryHandler } from './application/query-handler/posts/get-posts.query-handler.js';

@Module({
  imports: [CqrsModule, EventsModule],
  controllers: [
    UsersController,
    AuthController,
    SessionsController,
    PostController,
  ],
  providers: [
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
    CreatePostUseCase,
    DeletePostUseCase,
    FindAllSessionsQueryHandler,
    ProfileQueryHandler,
    GetUsersCountQueryHandler,
    GetUserProfileQueryHandler,
    UsersRepository,
    SessionsRepository,
    OAuthRepository,
    PostsRepository,
    PostsQueryRepository,
    SessionsQueryRepository,
    UsersQueryRepository,
    AuthSessionService,
    PasswordRecoveryService,
    PostDeletionSchedulerService,
    GetPostsQueryHandler,
    GoogleStrategy,
    GithubStrategy,
    AccessTokenGuard,
  ],
})
export class UserAccountsModule {}
