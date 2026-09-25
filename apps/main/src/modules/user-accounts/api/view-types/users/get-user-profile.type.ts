import { UserViewerStatus } from '../../../../../core/enums/user-viewer-status.enum.js';
import {
  AvatarImage,
  AvatarPreview,
} from '../../../../../core/types/prisma/json-types.js';

export type GetUserProfileType = {
  id: string;
  username: string;
  description: string | null;

  avatarUrl: AvatarImage;
  avatarPreviewUrl: AvatarPreview;

  followersCount: number;
  followingCount: number;
  publicationsCount: number;

  viewerStatus: UserViewerStatus;
};
