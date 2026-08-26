import { File } from '../../schemas/files.schema.js';
import { FileViewType } from '../view-types/file-view.type.js';
import { FilesResultType } from '../view-types/files-result.type.js';

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

  static toFilesResult(
    targetId: string,
    files: FileViewType[],
    preview: FileViewType,
  ): FilesResultType {
    return {
      targetId,
      files,
      preview,
    };
  }
}
