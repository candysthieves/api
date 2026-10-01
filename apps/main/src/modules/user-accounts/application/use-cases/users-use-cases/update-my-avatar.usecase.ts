import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import sharp from 'sharp';
import { MAX_AVATAR_IMAGE_SIZE } from '../../../../../../../../libs/contracts/avatar-image.contract.js';
import { DomainExceptions } from '../../../../../core/exceptions/domain-exceptions.js';
import { ErrorStatus } from '../../../../../core/exceptions/domain-exception-code.js';
import { ImageOutboxService } from '../../../../../core/events/image-outbox.service.js';
import { UsersRepository } from '../../../infrastructure/repositories/user-repositories/users.repository.js';

export class UpdateMyAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly file?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateMyAvatarCommand)
export class UpdateMyAvatarUseCase implements ICommandHandler<
  UpdateMyAvatarCommand,
  { userId: string }
> {
  constructor(
    private readonly users: UsersRepository,
    private readonly outbox: ImageOutboxService,
  ) {}
  async execute({
    userId,
    file,
  }: UpdateMyAvatarCommand): Promise<{ userId: string }> {
    if (
      !file ||
      !Buffer.isBuffer(file.buffer) ||
      !file.buffer.length ||
      file.size > MAX_AVATAR_IMAGE_SIZE ||
      file.size !== file.buffer.length ||
      !['image/jpeg', 'image/png'].includes(file.mimetype)
    )
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'file',
        'The photo must be less than 10 Mb and have JPEG or PNG format',
      );
    try {
      const metadata = await sharp(file.buffer).metadata();
      if (
        !['jpeg', 'png'].includes(metadata.format ?? '') ||
        !metadata.width ||
        !metadata.height
      )
        throw new Error('INVALID_IMAGE');
    } catch {
      DomainExceptions.badRequest(
        ErrorStatus.VALIDATION_ERROR,
        'file',
        'The photo must be less than 10 Mb and have JPEG or PNG format',
      );
    }
    await this.users.findByIdOrNotFound(userId);
    await this.outbox.saveAvatar(userId, file);
    return { userId };
  }
}
