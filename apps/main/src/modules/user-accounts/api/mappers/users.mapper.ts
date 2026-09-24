import { GetUsersCountType } from '../view-types/users/get-users-count.type.js';
import { User } from '../../../../generated/prisma/client.js';
import { GetUserProfileType } from '../view-types/users/get-user-profile.type.js';

import { AvatarProfileType } from '../view-types/users/avatar-profile.type.js';
import { DateTime } from 'luxon';
import { MyProfileType } from '../view-types/users/my-profile.type.js';
import { UserViewerStatus } from '../../../../core/enums/user-viewer-status.enum.js';

export class UsersMapper {
  static getDefaultAvatar(): AvatarProfileType {
    return {
      fileId: '550e8400-e29b-41d4-a716-446655440001',
      url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/avatar_close/avavatar.ru-indoor_setting-big_eyes-2272.webp',
      width: 900,
      height: 900,
    };
  }

  static getDefaultAvatarPreview(): AvatarProfileType {
    return {
      fileId: '550e8400-e29b-41d4-a716-446655440002',
      url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/avatar_close/avavatar.ru-indoor_setting-big_eyes-2272.webp',
      width: 900,
      height: 900,
    };
  }

  static toUsersCountView(count: number): GetUsersCountType {
    return {
      count: count,
    };
  }

  static toGetUserProfileView(
    user: User,
    publicationsCount: number,
    viewerStatus: UserViewerStatus,
  ): GetUserProfileType {
    return {
      id: user.id,
      username: user.username,
      description:
        'Превращаю макеты дизайнеров в живой код, воюю с центрированием div и делаю так, чтобы пользователям было красиво и удобно.',

      avatarUrl: this.getDefaultAvatar(),
      avatarPreviewUrl: this.getDefaultAvatarPreview(),

      followersCount: 0,
      followingCount: 0,
      publicationsCount,

      viewerStatus,
    };
  }

  static toMyProfileView(user: User): MyProfileType {
    return {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth
        ? DateTime.fromJSDate(user.dateOfBirth).toFormat('yyyy-MM-dd')
        : null,
      country: null,
      city: null,
      aboutMe: user.aboutMe,
    };
  }
}
