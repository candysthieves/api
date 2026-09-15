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

export type PostByIdViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  author: PostAuthorView;
  isOwner: boolean;
};
