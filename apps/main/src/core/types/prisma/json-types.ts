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

export type PostPreview = FileType;
