import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { S3Adapter } from '../../../../core/adapters/s3.adapter.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileDocument } from '../../schemas/files.schema.js';
import { ObjectResult } from '../../../../core/object-result.js';
import { FileMapper } from '../../api/mappers/file.mapper.js';

export class GetAvatarQuery {
  constructor(public readonly fileId: string) {}
}

@QueryHandler(GetAvatarQuery)
export class GetAvatarQueryHandler implements IQueryHandler<GetAvatarQuery> {
  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    private readonly s3: S3Adapter,
  ) {}

  async execute(
    query: GetAvatarQuery,
  ): Promise<ObjectResult<FileMapper | null>> {
    const existFile = await this.fileModel.findOne({
      where: { _id: query.fileId },
    });

    if (!existFile) {
      return ObjectResult.failure('File not found');
    }

    const fileUrl: string = await this.s3.getUrl(existFile.key);

    const fileView = FileMapper.toFileView(existFile, fileUrl);

    return ObjectResult.success(fileView);
  }
}
