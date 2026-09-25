import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';
import { PostAuthorViewType } from './post-author-view.type.js';

export type PostViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  willBeDeleted: string | null;
  author: PostAuthorViewType;
};
