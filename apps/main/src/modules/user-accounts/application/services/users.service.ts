import { Injectable } from '@nestjs/common';
import type { MediaFile } from '../../../../../../../libs/contracts/index.js';
import { UsersRepository } from '../../infrastructure/repositories/user-repositories/users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async activateBusiness(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { paymentStatus: 'Business' });
  }

  updateAvatar(
    userId: number,
    image: MediaFile,
    preview: MediaFile,
  ): Promise<boolean> {
    return this.usersRepository.updateAvatar(userId, image, preview);
  }
}
