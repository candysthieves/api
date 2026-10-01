import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { FilesTcpClient } from '../../../core/events/files-tcp.client.js';
import { AvatarFileDeletionsRepository } from '../infrastructure/repositories/user-repositories/avatar-file-deletions.repository.js';

@Injectable()
export class AvatarFileDeletionSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AvatarFileDeletionSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly deletions: AvatarFileDeletionsRepository,
    private readonly filesClient: FilesTcpClient,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.processDueDeletions(), 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueDeletions(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const due = await this.deletions.findDue(new Date());
      if (!due.length) return;

      const fileIds = due.map(({ fileId }) => fileId);
      const result = await this.filesClient.deleteFiles(fileIds);
      if (result.error) throw new Error(result.error.code);

      await this.deletions.deleteScheduled(fileIds);
    } catch (error) {
      this.logger.error(
        'Could not delete scheduled avatar files; deletion will be retried.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.processing = false;
    }
  }
}
