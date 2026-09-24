import { Post } from '../../../../generated/prisma/client.js';

export type PostAuthor = {
  id: string;
  username: string;
};

export type PostWithAuthor = Post & {
  user: PostAuthor;
};

