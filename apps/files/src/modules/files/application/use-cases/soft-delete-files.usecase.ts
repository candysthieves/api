import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ObjectResult } from '../../../../core/object-result.js';
import ms from 'ms';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileDocument } from '../../schemas/files.schema.js';

export class SoftDeleteFilesCommand {
  constructor(public readonly fileIds: string[]) {}
}

@CommandHandler(SoftDeleteFilesCommand)
export class SoftDeleteFilesUseCase implements ICommandHandler<SoftDeleteFilesCommand> {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
  ) {}
  async execute(command: SoftDeleteFilesCommand): Promise<ObjectResult<null>> {
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

    const deleteAt = new Date(Date.now() + ms('24h'));

    for (const file of files) {
      file.deleteAt = deleteAt;
      await file.save();
    }

    return ObjectResult.success(null);
  }
}
