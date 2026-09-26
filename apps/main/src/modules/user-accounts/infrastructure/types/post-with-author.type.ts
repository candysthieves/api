import { Post } from '../../../../generated/prisma/client.js';
import { AvatarPreview } from '../../../../core/types/prisma/json-types.js';

export type PostAuthor = {
  id: string;
  username: string;
  avatarPreview: AvatarPreview;
};

export type PostWithAuthor = Post & {
  user: PostAuthor;
};
