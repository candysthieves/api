import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';

@ApiExcludeController()
@Controller('testing')
export class TestController {
  constructor(private readonly prisma: PrismaService) {}

  @Delete('all-data')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllData(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany(),
      this.prisma.oAuthAccount.deleteMany(),
      this.prisma.post.deleteMany(),
      this.prisma.user.deleteMany(),
    ]);
  }
}
