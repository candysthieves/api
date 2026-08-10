import { OAuthProfileDto } from '../../../dto/oauth-profile.dto.js';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OAuthLoginCommand, OAuthLoginUseCase } from './oauth-login.usecase.js';

export class GithubOAuthLoginCommand {
  constructor(
    public readonly profile: OAuthProfileDto,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {}
}

@CommandHandler(GithubOAuthLoginCommand)
export class GithubOAuthLoginUseCase implements ICommandHandler<GithubOAuthLoginCommand> {
  constructor(private readonly oauthLoginUseCase: OAuthLoginUseCase) {}

  async execute(command: GithubOAuthLoginCommand) {
    return this.oauthLoginUseCase.execute(
      new OAuthLoginCommand(command.profile, command.ip, command.userAgent),
    );
  }
}
