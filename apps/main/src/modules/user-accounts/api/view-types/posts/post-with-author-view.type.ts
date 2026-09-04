import {
  PostImages,
  PostPreview,
} from '../../../../../core/types/prisma/json-types.js';


type PostAuthorView = {
  id: string;
  username: string;
};

export type PostWithAuthorViewType = {
  id: string;
  description: string;
  images: PostImages;
  preview: PostPreview;
  createdAt: string;
  willBeDeleted: string | null;
  author: PostAuthorView;
};
