import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// @ApiTags('Main')
@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  // @ApiOperation({ summary: 'Get the API welcome message' })
  // @ApiOkResponse({
  //   description: 'Welcome message returned successfully.',
  //   schema: { type: 'string', example: 'Main!' },
  // })
  getHello(): string {
    return 'Main!';
  }
}
