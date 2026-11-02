import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import {
  SET_USER_PERSONAL,
  type SetUserPersonalContract,
  type SetUserPersonalResult,
} from '@libs/contracts';

export const MAIN_TCP_CLIENT = 'MAIN_TCP_CLIENT';

@Injectable()
export class MainTcpService {
  constructor(@Inject(MAIN_TCP_CLIENT) private readonly client: ClientProxy) {}

  async setPersonalStatusForUser(userId: string): Promise<void> {
    const result = await lastValueFrom(
      this.client
        .send<SetUserPersonalResult, SetUserPersonalContract>(
          { cmd: SET_USER_PERSONAL },
          { userId },
        )
        .pipe(timeout(10_000)),
    );
    if (result?.success !== true)
      throw new Error('USER_STATUS_UPDATE_NOT_CONFIRMED');
  }
}
