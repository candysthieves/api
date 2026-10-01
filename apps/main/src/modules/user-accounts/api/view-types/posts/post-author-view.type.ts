import { AvatarPreview } from '../../../../../core/types/prisma/json-types.js';

export type PostAuthorViewType = {
  id: string;
  username: string;
  avatarPreviewUrl: AvatarPreview;
};
