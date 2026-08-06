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
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RegistrationCommand } from '../application/use-cases/auth-use-cases/registration.usecase.js';
import { RegistrationDto } from '../dto/registration.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { AccessTokenType } from '../../../core/types/access-token.type.js';
import { LoginCommand } from '../application/use-cases/auth-use-cases/login.usecase.js';
import { AccessAndRefreshTokensType } from '../../../core/types/access-and-refresh-tokens.type.js';
import { CookieAdapter } from '../../../core/adapters/cookie.adapter.js';
import { RefreshTokenGuard } from '../guards/refresh-token.guard.js';
import { LogoutCommand } from '../application/use-cases/auth-use-cases/logout.usecase.js';
import { User } from '../decorators/user.decorator.js';
import type { JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { RefreshTokenCommand } from '../application/use-cases/auth-use-cases/refresh-token,usecase.js';
import { RegistrationConfirmationDto } from '../dto/registration-confirmation.dto.js';
import { ConfirmEmailCommand } from '../application/use-cases/auth-use-cases/confirm-email.usecase.js';
import { ResendEmailDto } from '../dto/resend-email.dto.js';
import { ResendEmailCommand } from '../application/use-cases/auth-use-cases/resend-email.usecase.js';
import { PasswordRecoveryDto } from '../dto/password-recovery.dto.js';
import { PasswordRecoveryCommand } from '../application/use-cases/auth-use-cases/password-recovery.usecase.js';
import { ValidatePasswordRecoveryCodeDto } from '../dto/validate-password-recovery-code.dto.js';
import { ValidatePasswordRecoveryCodeCommand } from '../application/use-cases/auth-use-cases/validate-password-recovery-code.usecase.js';
import { NewPasswordDto } from '../dto/new-password.dto.js';
import { NewPasswordCommand } from '../application/use-cases/auth-use-cases/new-password.usecase.js';
import { type RequestWithUser } from '../../../core/types/request-with-user.type.js';
import { OAuthLoginCommand } from '../application/use-cases/auth-use-cases/oauth-login.usecase.js';
import { OAuthProfileDto } from '../dto/oauth-profile.dto.js';
import { GoogleAuthGuard } from '../guards/google-auth.guard.js';
import { RecaptchaService } from '../../../core/services/recaptcha.service.js';
import { apiErrorResponseSchema } from '../../../core/exceptions/api-error-response.swagger.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cookieAdapter: CookieAdapter,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  @Post('registration')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully.' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, passwords do not match, or the email or username is already registered.',
    schema: apiErrorResponseSchema,
  })
  async registration(@Body() registrationDto: RegistrationDto) {
    await this.commandBus.execute<RegistrationCommand, void>(
      new RegistrationCommand(registrationDto),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive an access token' })
  @ApiOkResponse({
    description: 'Access token issued successfully.',
    schema: {
      type: 'object',
      required: ['accessToken'],
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Request validation failed.',
    schema: apiErrorResponseSchema,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
    schema: apiErrorResponseSchema,
  })
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrationConfirmation(@Body() dto: RegistrationConfirmationDto) {
    await this.commandBus.execute<ConfirmEmailCommand, void>(
      new ConfirmEmailCommand(dto.code),
    );
  }

  @Post('resend-confirmation-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendConfirmationEmail(@Body() dto: ResendEmailDto) {
    return this.commandBus.execute<ResendEmailCommand, void>(
      new ResendEmailCommand(dto.email),
    );
  }

  @Post('password-recovery')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send a password recovery email' })
  @ApiBadRequestResponse({
    description: 'User with this email does not exist.',
    schema: apiErrorResponseSchema,
  })
  @ApiForbiddenResponse({
    description: 'reCAPTCHA verification failed.',
    schema: apiErrorResponseSchema,
  })
  async passwordRecovery(@Body() dto: PasswordRecoveryDto): Promise<void> {
    await this.recaptchaService.verifyPasswordRecovery(dto.recaptchaToken);
    await this.commandBus.execute<PasswordRecoveryCommand, void>(
      new PasswordRecoveryCommand(dto.email),
    );
  }

  @Get('password-recovery/validate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Validate a password recovery code' })
  @ApiBadRequestResponse({
    description: 'Invalid or expired recovery code.',
    schema: apiErrorResponseSchema,
  })
  async validatePasswordRecoveryCode(
    @Query() dto: ValidatePasswordRecoveryCodeDto,
  ): Promise<void> {
    await this.commandBus.execute<ValidatePasswordRecoveryCodeCommand, void>(
      new ValidatePasswordRecoveryCodeCommand(dto.recoveryCode),
    );
  }

  @Post('new-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password using a recovery code' })
  @ApiBadRequestResponse({
    description: 'Validation failed or recovery code is invalid.',
    schema: apiErrorResponseSchema,
  })
  async newPassword(@Body() dto: NewPasswordDto): Promise<void> {
    await this.commandBus.execute<NewPasswordCommand, void>(
      new NewPasswordCommand(dto),
    );
  }

  @Post('logout')
  @UseGuards(RefreshTokenGuard)
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
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: RequestWithUser<OAuthProfileDto>,
  ): Promise<AccessTokenType> {
    return this.commandBus.execute<OAuthLoginCommand, AccessTokenType>(
      new OAuthLoginCommand(
        req.user,
        req.ip ?? '',
        typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : '',
      ),
    );
  }
}
