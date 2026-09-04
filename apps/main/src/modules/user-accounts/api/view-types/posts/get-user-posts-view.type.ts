import { PostViewType } from './post-view.type.js';

export type GetUserPostsViewType = {
  items: PostViewType[];
  nextCursor: string | null;
  hasNextPage: boolean;
  isOwner: boolean;
};
