import { Post } from '../../../../generated/prisma/client.js';

export type PostWithAuthor = Post & {
  user: {
    id: string;
    username: string;
  };
};
