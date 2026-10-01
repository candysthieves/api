import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiGetCountries() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all countries',
      description: 'Returns a list of all available countries with names in Russian and English.',
    }),
    ApiOkResponse({
      description: 'List of countries successfully retrieved.',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          required: ['countryId', 'countryNameRu', 'countryNameEn'],
          properties: {
            countryId: {
              type: 'integer',
              description: 'Unique identifier of the country',
              example: 3,
            },
            countryNameRu: {
              type: 'string',
              description: 'Country name in Russian',
              example: 'Беларусь',
            },
            countryNameEn: {
              type: 'string',
              description: 'Country name in English',
              example: 'Belarus',
            },
          },
        },
      },
    }),
  );
}
