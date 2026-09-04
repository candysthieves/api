import { FileType } from '../../../../../core/types/prisma/json-types.js';

type PostAuthorView = {
  id: string;
  username: string;
};

export type PostWithAuthorViewType = {
  id: string;
  description: string;
  images: FileType[];
  preview: FileType;
  createdAt: string;
  willBeDeleted: string | null;
  author: PostAuthorView;
};
