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
      avatarUrl:
        'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/POST/f5a18989-10d9-4b0b-aac1-2df4430fa43c.webp',
      avatarPreviewUrl:
        'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/POST_PREVIEW/c381f4c9-a077-4e47-93b5-c434156087df.webp',

      followersCount: 0,
      followingCount: 0,
      publicationsCount,

      isOwner,
    };
  }
}
