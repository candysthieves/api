import { Injectable } from '@nestjs/common';
import { ICommandHandler } from '@nestjs/cqrs';

export class ConfirmEmailCommand {
  constructor(public readonly code: string) {}
}

@Injectable()
export class ConfirmEmailUseCase implements ICommandHandler<ConfirmEmailCommand> {
  async execute() {}
}
