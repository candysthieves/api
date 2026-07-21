import { Controller, Get } from '@nestjs/common';
import { FilesService } from './files.service.js';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':id')
  getHello(): string {
    return 'Files';
  }
}
