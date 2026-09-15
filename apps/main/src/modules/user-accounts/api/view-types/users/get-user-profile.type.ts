import { AvatarProfileType } from './avatar-profile.type.js';

export type GetUserProfileType = {
  id: string;
  username: string;
  description: string;
  avatarUrl: AvatarProfileType;
  avatarPreviewUrl: AvatarProfileType;

  followersCount: number;
  followingCount: number;
  publicationsCount: number;

  isOwner: boolean;
};
