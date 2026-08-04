import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OAuthProfileDto } from '../../../dto/oauth-profile.dto.js';

export class OAuthLoginCommand {
  constructor(public readonly profile: OAuthProfileDto) {}
}

@CommandHandler(OAuthLoginCommand)
export class OAuthLoginUseCase implements ICommandHandler<OAuthLoginCommand> {
  constructor() {}

  async execute({ profile }: OAuthLoginCommand) {}
}
