import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';

export class SetUserPersonalCommand {
  constructor(public readonly userId: number) {}
}

@CommandHandler(SetUserPersonalCommand)
export class SetUserPersonalUseCase implements ICommandHandler<
  SetUserPersonalCommand,
  void
> {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute({ userId }: SetUserPersonalCommand): Promise<void> {
    await this.usersRepository.setPersonal(userId);
  }
}
