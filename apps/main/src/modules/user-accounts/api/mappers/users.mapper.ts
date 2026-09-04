import { GetUsersCountType } from '../view-types/users/get-users-count.type.js';
import { User } from '../../../../generated/prisma/client.js';
import { GetUserProfileType } from '../view-types/users/get-user-profile.type.js';

export class UsersMapper {
  static toUsersCountView(count: number): GetUsersCountType {
    return {
      count: count,
    };
  }

  static toGetUserProfileView(
    user: User,
    publicationsCount: number,
    isOwner: boolean,
  ): GetUserProfileType {
    return {
      id: user.id,
      username: user.username,
      description:
        'Превращаю макеты дизайнеров в живой код, воюю с центрированием div и делаю так, чтобы пользователям было красиво и удобно.',

      avatarUrl: {
        fileId: '550e8400-e29b-41d4-a716-446655440001',
        url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
        width: 8000,
        height: 8000,
      },

      avatarPreviewUrl: {
        fileId: '550e8400-e29b-41d4-a716-446655440002',
        url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/fallback/profile.webp',
        width: 8000,
        height: 8000,
      },

      followersCount: 0,
      followingCount: 0,
      publicationsCount,

      isOwner,
    };
  }
}
