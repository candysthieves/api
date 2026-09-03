import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileDocument } from '../../schemas/files.schema.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';

export class DeleteFilesCommand {
  constructor(public readonly fileIds: string[]) {}
}

@CommandHandler(DeleteFilesCommand)
export class DeleteFilesUseCase implements ICommandHandler<
  DeleteFilesCommand,
  ObjectResult<null>
> {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
  ) {}
  async execute(command: DeleteFilesCommand): Promise<ObjectResult<null>> {
    const files = await this.fileModel.find({
      fileId: { $in: command.fileIds },
    });

    for (const file of files) {
      await this.s3.deleteFile(file.key);
      await file.deleteOne();
    }

    return ObjectResult.success(null);
  }
}
