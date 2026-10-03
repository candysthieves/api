import { GetUsersCountType } from '../view-types/users/get-users-count.type.js';
import { City, Country, User } from '../../../../generated/prisma/client.js';
import { GetUserProfileType } from '../view-types/users/get-user-profile.type.js';
import { DateTime } from 'luxon';
import { MyProfileType } from '../view-types/users/my-profile.type.js';
import { UserViewerStatus } from '../../../../core/enums/user-viewer-status.enum.js';
import {
  AvatarImage,
  AvatarPreview,
} from '../../../../core/types/prisma/json-types.js';
import { GetMyAvatarType } from '../view-types/users/get-my-avatar.type.js';
import { LocationsMapper } from './locations.mapper.js';

export class UsersMapper {
  static getDefaultAvatar(): AvatarImage {
    return {
      fileId: '550e8400-e29b-41d4-a716-446655440001',
      url: 'https://lumusapp-528592447405-eu-north-1-an.s3.eu-north-1.amazonaws.com/files/avatar_close/avavatar.ru-indoor_setting-big_eyes-2272.webp',
      width: 900,
      height: 900,
    };
  }

  static getDefaultAvatarPreview(): AvatarPreview {
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
      id: String(user.id),
      username: user.username,
      description: user.aboutMe,

      avatarUrl: user.avatar ?? null,
      avatarPreviewUrl: user.avatarPreview ?? null,

      followersCount: 0,
      followingCount: 0,
      publicationsCount,

      viewerStatus,
    };
  }

  static toMyProfileView(
    user: User & { country?: Country | null; city?: City | null },
    locations?: {
      country?: Country | null;
      city?: City | null;
    },
  ): MyProfileType {
    const country = locations?.country !== undefined ? locations.country : user.country;
    const city = locations?.city !== undefined ? locations.city : user.city;

    return {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth
        ? DateTime.fromJSDate(user.dateOfBirth).toFormat('yyyy-MM-dd')
        : null,
      country: country ? LocationsMapper.toGetCountryView(country) : null,
      city: city ? LocationsMapper.toGetCityView(city) : null,
      aboutMe: user.aboutMe,
    };
  }

  static toGetMyAvatarView(user: User): GetMyAvatarType {
    return {
      avatarUrl: user.avatar ?? null,
      avatarPreviewUrl: user.avatarPreview ?? null,
    };
  }
}
