import { File } from '../../schemas/files.schema.js';
import { FileViewType } from '../view-types/file-view.type.js';

export class FileMapper {
  static toFileView(file: File, imageUrl: string): FileViewType {
    return {
      _id: file._id.toString(),
      fileId: file.fileId,
      type: file.type,
      key: file.key,
      originalName: file.originalName,
      url: imageUrl,
      size: file.size,
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt ?? null,
    };
  }
}
