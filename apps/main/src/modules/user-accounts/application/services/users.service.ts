import { Injectable } from '@nestjs/common';
import type { MediaFile } from '../../../../../../../libs/contracts/index.js';
import { UsersRepository } from '../../infrastructure/repositories/user-repositories/users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  updateAvatar(
    userId: number,
    image: MediaFile,
    preview: MediaFile,
  ): Promise<boolean> {
    return this.users.updateAvatar(userId, image, preview);
  }
}
