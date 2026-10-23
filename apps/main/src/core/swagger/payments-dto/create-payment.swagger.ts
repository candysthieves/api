import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaymentViewType } from '../../../modules/payments/api/view-types/payment-view.type.js';

export function ApiCreatePayment() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Create payment and get external checkout URL',
      description:
        'Creates a payment session with the selected provider (STRIPE or YOOKASSA) for the given tariff and returns payment ID and redirect URL.',
    }),
    ApiOkResponse({
      description: 'Payment session created successfully',
      type: PaymentViewType,
    }),
    ApiBadRequestResponse({
      description: 'Invalid request or payment provider',
    }),
    ApiNotFoundResponse({ description: 'Tariff not found' }),
    ApiUnauthorizedResponse({
      description: 'Access token is missing or expired',
    }),
    ApiResponse({ status: 498, description: 'Access token is invalid' }),
  );
}
