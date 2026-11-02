import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  SET_USER_PERSONAL,
  type SetUserPersonalContract,
  type SetUserPersonalResult,
} from '@libs/contracts';
import { SetUserPersonalCommand } from '../../application/use-cases/users-use-cases/set-user-personal.usecase.js';

@Controller()
export class UserPaymentStatusController {
  constructor(private readonly commandBus: CommandBus) {}

  @MessagePattern({ cmd: SET_USER_PERSONAL })
  async setPersonal(
    @Payload() payload: SetUserPersonalContract,
  ): Promise<SetUserPersonalResult> {
    await this.commandBus.execute(
      new SetUserPersonalCommand(Number(payload.userId)),
    );
    return { success: true };
  }
}
