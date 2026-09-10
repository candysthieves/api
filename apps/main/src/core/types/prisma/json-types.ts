export type PostLocation = {
  id: string;
  address: string;
};

export type FileType = {
  fileId: string;
  url: string;
  width: number;
  height: number;
};

export type PostLocations = PostLocation[];

export type PostImage = FileType;

export type PostImages = PostImage[];

export type PostPreview = FileType | null;

declare global {
  namespace PrismaJson {
    type PostLocations = import('./json-types.js').PostLocations;
    type PostImages = import('./json-types.js').PostImages;
    type PostPreview = import('./json-types.js').PostPreview;
  }
}
