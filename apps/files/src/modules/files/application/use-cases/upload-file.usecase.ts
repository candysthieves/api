import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FileDocument, FileType } from '../../schemas/files.schema.js';
import { FilesService } from '../files.service.js';
import { FileDataFactory } from '../factories/file-data.factory.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Adapter } from '../../adapters/s3.adapter.js';
import bytes from 'bytes';

export class UploadFileCommand {
  constructor(
    public readonly file: Express.Multer.File,
    public type: FileType,
  ) {}
}

@CommandHandler(UploadFileCommand)
export class UploadFileUseCase implements ICommandHandler<UploadFileCommand> {
  // const fileMaxSIze = bytes('5MB');

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly fileService: FilesService,
    private readonly s3Adapter: S3Adapter,
  ) {}

  async execute({ file, type }: UploadFileCommand) {
    // if (fileMaxSIze && file.size >= fileMaxSIze) {
    //   //file ERROR 'Maximum file size is 5MB'
    // }

    const processed = await this.fileService.processImage(file, type);

    const createFileData = FileDataFactory.prepareCreateData({
      type,
      originalName: file.originalname,
      size: processed.size,
      width: processed.width,
      height: processed.height,
    });

    await this.s3Adapter.uploadFIle(
      createFileData.key,
      processed.buffer,
      createFileData.mimeType,
    );

    return this.fileModel.create(createFileData);
  }
}
