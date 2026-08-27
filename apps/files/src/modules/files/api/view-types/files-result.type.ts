import { FileViewType } from './file-view.type.js';

export type FilesResultType = {
  targetId: string;
  files: FileViewType[];
  preview: FileViewType;
};
