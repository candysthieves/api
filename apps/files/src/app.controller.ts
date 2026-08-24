import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getMessage(): string {
    return 'Files microservice';
  }
}
