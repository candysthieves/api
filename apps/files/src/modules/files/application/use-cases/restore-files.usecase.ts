import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ObjectResult } from '../../../../core/object-result.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileDocument } from '../../schemas/files.schema.js';

export class RestoreFilesCommand {
  constructor(public readonly fileIds: string[]) {}
}

@CommandHandler(RestoreFilesCommand)
export class RestoreFilesUseCase implements ICommandHandler<RestoreFilesCommand> {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
  ) {}

  async execute(command: RestoreFilesCommand): Promise<ObjectResult<null>> {
    const files = await this.fileModel.find({
      fileId: { $in: command.fileIds },
    });

    if (command.fileIds.length !== files.length) {
      return ObjectResult.failure({
        code: 'FILE_NOT_FOUND',
        errors: [
          {
            field: 'file',
            message: 'Some files were not found',
          },
        ],
      });
    }

    for (const file of files) {
      file.deleteAt = null;
      await file.save();
    }

    return ObjectResult.success(null);
  }
}
