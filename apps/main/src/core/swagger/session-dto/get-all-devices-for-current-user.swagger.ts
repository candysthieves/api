import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiGetAllSessionsForTheCurrentUser() {
  return applyDecorators(
    ApiCookieAuth('refreshToken'),
    ApiOperation({ summary: 'Get active sessions for the current user' }),
    ApiOkResponse({
      description: 'Success',
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ip: {
                  type: 'string',
                  format: 'ipv4',
                  description: 'IPv4 address from which the device signed in',
                  example: '192.168.1.42',
                },
                title: {
                  type: 'string',
                  description: 'Device name parsed from the User-Agent header',
                  example: 'Chrome 126 on Windows 11',
                },
                lastActiveDate: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Date when the session was last active',
                  example: '2024-06-15T14:30:00.000Z',
                },
                deviceId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Identifier of the device session',
                  example: '550e8400-e29b-41d4-a716-446655440000',
                },
              },
              required: ['ip', 'title', 'lastActiveDate', 'deviceId'],
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    }),
    ApiResponse({ status: 498, description: 'Invalid refresh token' }),
  );
}
