import type { MediaFile } from '@libs/contracts';

type FileDetails = {
  fileId: string;
  width: number;
  height: number;
};

// Формирует общий формат файла для событий поста и аватарки.
export function toMediaFile(file: FileDetails, url: string): MediaFile {
  return {
    fileId: file.fileId,
    url,
    width: file.width,
    height: file.height,
  };
}
