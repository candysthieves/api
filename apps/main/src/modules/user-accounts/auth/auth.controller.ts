import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor() {}

  @Get()
  getText() {
    return 'Hello World!';
  }
}
