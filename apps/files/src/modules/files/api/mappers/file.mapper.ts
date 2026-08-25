import { File } from '../../schemas/files.schema.js';
import { FileViewType } from '../view-types/file-view.type.js';

export class FileMapper {
  static toFileView(file: File, imageUrl: string): FileViewType {
    return {
      _id: file._id.toString(),
      fileId: file.fileId,
      url: imageUrl,
      width: file.width,
      height: file.height,
    };
  }
}
