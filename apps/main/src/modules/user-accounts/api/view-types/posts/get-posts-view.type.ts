import { PostWithAuthorViewType } from './post-with-author-view.type.js';

export type GetAllPostsViewType = {
  items: PostWithAuthorViewType[];
  nextCursor: string | null;
  hasNextPage: boolean;
};
