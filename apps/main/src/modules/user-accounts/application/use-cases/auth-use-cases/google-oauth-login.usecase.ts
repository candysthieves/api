import { OAuthProfileDto } from '../../../api/dto/oauth-profile.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OAuthLoginCommand, OAuthLoginUseCase } from './oauth-login.usecase.js';

export class GoogleOAuthLoginCommand {
  constructor(
    public readonly profile: OAuthProfileDto,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {}
}

@CommandHandler(GoogleOAuthLoginCommand)
export class GoogleOAuthLoginUseCase implements ICommandHandler<GoogleOAuthLoginCommand> {
  constructor(private readonly oauthLoginUseCase: OAuthLoginUseCase) {}

  async execute(command: GoogleOAuthLoginCommand) {
    return this.oauthLoginUseCase.execute(
      new OAuthLoginCommand(command.profile, command.ip, command.userAgent),
    );
  }
}
