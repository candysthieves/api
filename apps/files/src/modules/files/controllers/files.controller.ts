import { Controller, Get } from '@nestjs/common';
import { FilesService } from '../services/files.service.js';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  getMessage(): string {
    return 'Files';
  }
}
