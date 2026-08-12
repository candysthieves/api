import { User } from '../../../../generated/prisma/client.js';
import { ProfileViewType } from '../view-types/auth/profile-view.type.js';

export class UserMapper {
  static toProfileView(user: User): ProfileViewType {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailConfirmed: user.isEmailConfirmed,
    };
  }
}
