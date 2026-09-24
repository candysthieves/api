import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';
import { PostAuthorViewType } from './post-author-view.type.js';
import { UserViewerStatus } from '../../../../../core/enums/user-viewer-status.enum.js';

export type PostByIdViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  author: PostAuthorViewType;
  viewerStatus: UserViewerStatus;
};
