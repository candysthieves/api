import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { apiErrorResponseSchema } from '../../exceptions/api-error-response.swagger.js';

export function ApiRegistrationConfirmation() {
  return applyDecorators(
    ApiOperation({ summary: 'Confirm registration' }),
    ApiNoContentResponse({
      description: 'Email was verified. Account was activated',
    }),
    ApiBadRequestResponse({
      description:
        'if the confirmation code is incorrect, expired or already been applied',
      schema: apiErrorResponseSchema,
    }),
  );
}
