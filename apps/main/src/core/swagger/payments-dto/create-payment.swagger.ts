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
import { ErrorStatus } from '../../exceptions/domain-exception-code.js';
import { PaymentViewType } from '../../../modules/payments/api/view-types/payment-view.type.js';

export function ApiCreatePayment() {
  return applyDecorators(
    ApiBearerAuth('accessToken'),
    ApiOperation({
      summary: 'Create payment and get external checkout URL',
      description:
        'Creates a Processing subscription and a payment session with the selected provider (STRIPE or YOOKASSA). Returns payment ID and redirect URL. Rejected while the latest subscription is Processing.',
    }),
    ApiOkResponse({
      description: 'Payment session created successfully',
      type: PaymentViewType,
    }),
    ApiBadRequestResponse({
      description:
        'Request validation failed, unsupported payment provider, or the latest subscription is still Processing (PAYMENT_CREATION_FAILED)',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            example: ErrorStatus.VALIDATION_ERROR,
            description: `Possible error codes: ${ErrorStatus.VALIDATION_ERROR} (VALIDATION_ERROR), ${ErrorStatus.UNSUPPORTED_PAYMENT_PROVIDER} (UNSUPPORTED_PAYMENT_PROVIDER), ${ErrorStatus.PAYMENT_CREATION_FAILED} (PAYMENT_CREATION_FAILED)`,
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'provider' },
                message: {
                  type: 'string',
                  example: 'provider must be either STRIPE or YOOKASSA',
                },
              },
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Tariff with specified ID was not found',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: {
            type: 'number',
            example: ErrorStatus.TARIFF_NOT_FOUND,
          },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'tariffId' },
                message: {
                  type: 'string',
                  example: "Tariff with id '1' was not found",
                },
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Access token has expired',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.ACCESS_TOKEN_EXPIRED },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'token' },
                message: {
                  type: 'string',
                  example: 'Access token has expired',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 498,
      description: 'Access token is invalid',
      schema: {
        type: 'object',
        required: ['code', 'errorsMessages'],
        properties: {
          code: { type: 'number', example: ErrorStatus.ACCESS_TOKEN_INVALID },
          errorsMessages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'message'],
              properties: {
                field: { type: 'string', example: 'token' },
                message: { type: 'string', example: 'Invalid access token' },
              },
            },
          },
        },
      },
    }),
  );
}
