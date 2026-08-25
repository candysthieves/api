import { FileType } from '../../schemas/files.schema.js';

export type FileViewType = {
  _id: string;
  fileId: string;
  type: FileType;
  key: string;
  originalName: string;
  url: string;
  size: number;
  width: number;
  height: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};
