import { AvatarProfileType } from './avatar-profile.type.js';
import { UserViewerStatus } from '../../../../../core/enums/user-viewer-status.enum.js';

export type GetUserProfileType = {
  id: string;
  username: string;
  description: string;
  avatarUrl: AvatarProfileType;
  avatarPreviewUrl: AvatarProfileType;

  followersCount: number;
  followingCount: number;
  publicationsCount: number;

  viewerStatus: UserViewerStatus;
};
