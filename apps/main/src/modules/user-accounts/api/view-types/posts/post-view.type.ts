import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';

export type PostViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  willBeDeleted: string | null;
};
