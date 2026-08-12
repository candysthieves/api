import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { RegistrationCommand } from '../application/use-cases/auth-use-cases/registration.usecase.js';
import { RegistrationDto } from './dto/registration.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AccessTokenType } from '../../../core/types/access-token.type.js';
import { LoginCommand } from '../application/use-cases/auth-use-cases/login.usecase.js';
import { AccessAndRefreshTokensType } from '../../../core/types/access-and-refresh-tokens.type.js';
import { CookieAdapter } from '../../../core/adapters/cookie.adapter.js';
import { RefreshTokenGuard } from './guards/refresh-token.guard.js';
import { LogoutCommand } from '../application/use-cases/auth-use-cases/logout.usecase.js';
import { User } from './decorators/user.decorator.js';
import {
  type JwtAccessPayload,
  type JwtRefreshPayload,
} from '../../../core/types/jwt-payload.type.js';
import { RefreshTokenCommand } from '../application/use-cases/auth-use-cases/refresh-token,usecase.js';
import { RegistrationConfirmationDto } from './dto/registration-confirmation.dto.js';
import { ConfirmEmailCommand } from '../application/use-cases/auth-use-cases/confirm-email.usecase.js';
import { ResendEmailDto } from './dto/resend-email.dto.js';
import { ResendEmailCommand } from '../application/use-cases/auth-use-cases/resend-email.usecase.js';
import { PasswordRecoveryDto } from './dto/password-recovery.dto.js';
import { PasswordRecoveryCommand } from '../application/use-cases/auth-use-cases/password-recovery.usecase.js';
import { ValidatePasswordRecoveryCodeDto } from './dto/validate-password-recovery-code.dto.js';
import { ValidatePasswordRecoveryCodeCommand } from '../application/use-cases/auth-use-cases/validate-password-recovery-code.usecase.js';
import { NewPasswordDto } from './dto/new-password.dto.js';
import { NewPasswordCommand } from '../application/use-cases/auth-use-cases/new-password.usecase.js';
import { type RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { OAuthProfileDto } from './dto/oauth-profile.dto.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { RecaptchaService } from '../../../core/services/recaptcha.service.js';
import { GoogleOAuthLoginCommand } from '../application/use-cases/auth-use-cases/google-oauth-login.usecase.js';
import { AppConfig } from '../../../app.config.js';
import { ApiRegistrationNewUser } from '../../../core/swagger/authDTO/regestration_swagger_flow.js';
import { ApiLogin } from '../../../core/swagger/authDTO/login_swagger_flow.js';
import { ApiRefreshToken } from '../../../core/swagger/authDTO/refresh_token_swagger_flow.js';
import { ApiRegistrationConfirmation } from '../../../core/swagger/authDTO/confirm_registration_swagger.js';
import { ApiResendConfirmationEmail } from '../../../core/swagger/authDTO/resend_confirmation_email_swagger.js';
import { ApiPasswordRecovery } from '../../../core/swagger/authDTO/password_recovery_swagger.js';
import { ApiRecoveryPasswordValidate } from '../../../core/swagger/authDTO/recovery_password_validate.js';
import { ApiNewPassword } from '../../../core/swagger/authDTO/new_password_swagger.js';
import { ApiLogout } from '../../../core/swagger/authDTO/logout_swagger.js';
import { ApiGoogleCallback } from '../../../core/swagger/authDTO/google_oAuth_callback_swagger.js';
import { ApiGoogleAuth } from '../../../core/swagger/authDTO/google_oAuth_swagger.js';
import { ProfileViewType } from './view-types/auth/profile-view.type.js';
import { ProfileQuery } from '../application/query-handler/auth/profile.usecase.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: AppConfig,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly cookieAdapter: CookieAdapter,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  @Post('registration')
  @ApiRegistrationNewUser()
  @HttpCode(HttpStatus.CREATED)
  async registration(@Body() registrationDto: RegistrationDto) {
    await this.commandBus.execute<RegistrationCommand, void>(
      new RegistrationCommand(registrationDto),
    );
  }

  @Post('login')
  @ApiLogin()
  @HttpCode(HttpStatus.OK)
  async login(
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
    @Body() loginDto: LoginDto,
  ): Promise<AccessTokenType> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      LoginCommand,
      AccessAndRefreshTokensType
    >(
      new LoginCommand(
        loginDto,
        req.ip ?? '',
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : '',
      ),
    );
    this.cookieAdapter.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  @Post('refresh-token')
  @UseGuards(RefreshTokenGuard)
  @ApiRefreshToken()
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Res({ passthrough: true }) res: Response,
    @User() user: JwtRefreshPayload,
  ): Promise<AccessTokenType> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      RefreshTokenCommand,
      AccessAndRefreshTokensType
    >(new RefreshTokenCommand(user));
    this.cookieAdapter.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('registration-confirmation')
  @ApiRegistrationConfirmation()
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrationConfirmation(@Body() dto: RegistrationConfirmationDto) {
    await this.commandBus.execute<ConfirmEmailCommand, void>(
      new ConfirmEmailCommand(dto.code),
    );
  }

  @Post('resend-confirmation-email')
  @ApiResendConfirmationEmail()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendConfirmationEmail(@Body() dto: ResendEmailDto) {
    return this.commandBus.execute<ResendEmailCommand, void>(
      new ResendEmailCommand(dto.email),
    );
  }

  @Post('password-recovery')
  @ApiPasswordRecovery()
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwordRecovery(@Body() dto: PasswordRecoveryDto): Promise<void> {
    await this.recaptchaService.verifyPasswordRecovery(dto.recaptchaToken);
    await this.commandBus.execute<PasswordRecoveryCommand, void>(
      new PasswordRecoveryCommand(dto.email),
    );
  }

  @Get('password-recovery/validate')
  @ApiRecoveryPasswordValidate()
  @HttpCode(HttpStatus.NO_CONTENT)
  async validatePasswordRecoveryCode(
    @Query() dto: ValidatePasswordRecoveryCodeDto,
  ): Promise<void> {
    await this.commandBus.execute<ValidatePasswordRecoveryCodeCommand, void>(
      new ValidatePasswordRecoveryCodeCommand(dto.recoveryCode),
    );
  }

  @Post('new-password')
  @ApiNewPassword()
  @HttpCode(HttpStatus.NO_CONTENT)
  async newPassword(@Body() dto: NewPasswordDto): Promise<void> {
    await this.commandBus.execute<NewPasswordCommand, void>(
      new NewPasswordCommand(dto),
    );
  }

  @Post('logout')
  @UseGuards(RefreshTokenGuard)
  @ApiLogout()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @User() user: JwtRefreshPayload,
  ): Promise<void> {
    await this.commandBus.execute<LogoutCommand, void>(new LogoutCommand(user));

    this.cookieAdapter.clearRefreshCookie(res);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiGoogleAuth()
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiGoogleCallback()
  async googleCallback(
    @Res() res: Response,
    @Req() req: RequestWithUser<OAuthProfileDto>,
  ) {
    const { refreshToken } = await this.commandBus.execute<
      GoogleOAuthLoginCommand,
      AccessAndRefreshTokensType
    >(
      new GoogleOAuthLoginCommand(
        req.user,
        req.ip ?? '',
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : '',
      ),
    );

    this.cookieAdapter.setRefreshCookie(res, refreshToken);

    return res.redirect(`${this.config.clientUrl}/oauth/success`);
  }

  @Get('@me')
  @UseGuards(AccessTokenGuard)
  async profile(@User() user: JwtAccessPayload): Promise<ProfileViewType> {
    const { userId } = user;
    return this.queryBus.execute<ProfileQuery, ProfileViewType>(
      new ProfileQuery(userId),
    );
  }
}
