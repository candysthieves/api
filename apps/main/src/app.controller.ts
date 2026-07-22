import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Main')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Get the API welcome message' })
  @ApiOkResponse({
    description: 'Welcome message returned successfully.',
    schema: { type: 'string', example: 'Main!' },
  })
  getHello(): string {
    return 'Main!';
  }
}
