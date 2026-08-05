export const apiErrorResponseSchema = {
  type: 'object',
  required: ['errorsMessages'],
  properties: {
    errorsMessages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'message'],
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'Incorrect email' },
        },
      },
    },
  },
  example: {
    errorsMessages: [{ field: 'email', message: 'Incorrect email' }],
  },
};
