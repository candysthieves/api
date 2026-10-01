import { PostViewType } from './post-view.type.js';
import { UserViewerStatus } from '../../../../../core/enums/user-viewer-status.enum.js';

export type GetUserPostsViewType = {
  items: PostViewType[];
  nextCursor: string | null;
  hasNextPage: boolean;
  viewerStatus: UserViewerStatus;
};
