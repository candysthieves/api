import { AvatarPreview } from '../../../../../core/types/prisma/json-types.js';

export type PostAuthorViewType = {
  id: number;
  username: string;
  avatarPreviewUrl: AvatarPreview;
};
