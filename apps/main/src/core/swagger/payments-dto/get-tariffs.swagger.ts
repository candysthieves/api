import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { TariffViewType } from '../../../modules/payments/api/view-types/tariff-view.type.js';

export function ApiGetTariffs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get list of available subscription tariffs',
      description:
        'Fetches active subscription tariffs of the requested type with prices in minor units (cents).',
    }),
    ApiOkResponse({
      description: 'List of tariffs retrieved successfully',
      type: TariffViewType,
      isArray: true,
    }),
  );
}
