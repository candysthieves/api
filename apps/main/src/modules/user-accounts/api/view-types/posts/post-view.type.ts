import { FileType } from '../../../../../core/types/prisma/json-types.js';

export type PostViewType = {
  id: string;
  description: string;
  images: FileType[];
  preview: FileType;
  createdAt: string;
  willBeDeleted: string | null;
};
