import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';
import { AvatarProfileType } from '../users/avatar-profile.type.js';

type PostAuthorView = {
  id: string;
  username: string;
  avatarUrl: AvatarProfileType;
  avatarPreviewUrl: AvatarProfileType;
};

export type PostWithAuthorViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  willBeDeleted: string | null;
  author: PostAuthorView;
};
