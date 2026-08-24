import { FileType } from '../../schemas/files.schema.js';

type CreateFileDataType = {
  type: FileType;
  originalName: string;
  size: number;
  width: number;
  height: number;
};

export class FileDataFactory {
  static prepareCreateData(params: CreateFileDataType) {
    const fileId = crypto.randomUUID();

    return {
      fileId: fileId,
      type: params.type,
      originalName: params.originalName,
      key: `files/${params.type}/${fileId}.webp`,
      size: params.size,
      width: params.width,
      height: params.height,
      mimeType: 'image/webp',
    };
  }
}
