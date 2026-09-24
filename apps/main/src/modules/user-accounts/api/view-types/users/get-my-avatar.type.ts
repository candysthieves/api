import {
  AvatarImage,
  AvatarPreview,
} from '../../../../../core/types/prisma/json-types.js';

export type GetMyAvatarType = {
  avatarUrl: AvatarImage;
  avatarPreviewUrl: AvatarPreview;
};
