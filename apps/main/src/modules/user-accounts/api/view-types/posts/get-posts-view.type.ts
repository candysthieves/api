import { PostViewType } from './post-view.type.js';

export type GetPostsViewType = {
  items: PostViewType[];
  nextCursor: string | null;
  hasNextPage: boolean;
};
