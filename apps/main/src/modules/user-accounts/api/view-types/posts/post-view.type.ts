import { FileType } from '../files/file.type.js';

export type PostViewType = {
  id: string;
  description: string;
  images: FileType[];
  preview: FileType[];
  createdAt: string;
  willBeDeleted: string | null;
};
