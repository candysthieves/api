import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
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
import { type JwtRefreshPayload } from '../../../core/types/jwt-payload.type.js';
import { RefreshTokenCommand } from '../application/use-cases/auth-use-cases/refresh-token,usecase.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly cookieAdapter: CookieAdapter,
  ) {}

  @Post('registration')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully.' })
  @ApiBadRequestResponse({
    description:
      'Validation failed, passwords do not match, or the email or username is already registered.',
    schema: {
      example: {
        message: 'User with this email is already registered',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
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
  @ApiBadRequestResponse({ description: 'Request validation failed.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
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
}
