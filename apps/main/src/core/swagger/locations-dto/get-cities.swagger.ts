import { ApiOkResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiGetCities() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get cities by country ID',
      description: 'Returns a list of cities for the specified country ID with names in Russian and English.',
    }),
    ApiParam({
      name: 'countryId',
      type: Number,
      description: 'ID of the country to get cities for',
      example: 3,
    }),
    ApiOkResponse({
      description: 'List of cities successfully retrieved.',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          required: ['cityId', 'countryId', 'cityNameRu', 'cityNameEn'],
          properties: {
            cityId: {
              type: 'integer',
              description: 'Unique identifier of the city',
              example: 625144,
            },
            countryId: {
              type: 'integer',
              description: 'Identifier of the country this city belongs to',
              example: 3,
            },
            cityNameRu: {
              type: 'string',
              description: 'City name in Russian',
              example: 'Минск',
            },
            cityNameEn: {
              type: 'string',
              description: 'City name in English',
              example: 'Minsk',
            },
          },
        },
      },
    }),
  );
}
