import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { type Response } from 'express';
import { CommandBus } from '@nestjs/cqrs';
import { RegistrationDto } from './application/dto/registration.dto.js';
import { RegistrationCommand } from './application/usecases/registration.usecase.js';
import { LoginDto } from './application/dto/login.dto.js';
import { LoginCommand } from './application/usecases/login.usecase.js';
import { AccessAndRefreshTokensType } from './types/access-and-refresh-tokens.type.js';
import { AccessTokenType } from './types/access-token.type.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('registration')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() registrationDto: RegistrationDto) {
    await this.commandBus.execute<RegistrationCommand, void>(
      new RegistrationCommand(registrationDto),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ): Promise<AccessTokenType> {
    const { accessToken, refreshToken } = await this.commandBus.execute<
      LoginCommand,
      AccessAndRefreshTokensType
    >(new LoginCommand(loginDto));

    return { accessToken };
  }
}
