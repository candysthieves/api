import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';

type PostAuthorView = {
  id: string;
  username: string;
};

export type PostByIdViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  author: PostAuthorView;
  isOwner: boolean;
};
