import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Telemedicine Service API',
      version: '1.0.0',
      description:
        'Agora RTC token generation for video consultations. Owned by Member 3.',
      contact: { name: 'Member 3 – Payment & Telemedicine Services' },
    },
    servers: [
      { url: 'http://localhost:3005', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        AgoraToken: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Agora RTC token for joining the video channel' },
            channelName: { type: 'string', example: 'appointment-456' },
            uid: { type: 'integer', description: 'Agora user ID' },
            expiresAt: { type: 'integer', description: 'Unix timestamp when token expires' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Telemedicine', description: 'Video consultation token endpoints' },
      { name: 'System', description: 'Health check' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Service health check',
          responses: { '200': { description: 'Healthy' } },
        },
      },
      '/api/telemedicine/token': {
        post: {
          tags: ['Telemedicine'],
          summary: 'Generate Agora RTC token for video session',
          description:
            'Generates a time-limited Agora token for the patient or doctor to join the video consultation room. ' +
            'Channel name is derived from the appointment ID.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['appointmentId'],
                  properties: {
                    appointmentId: { type: 'integer', example: 42 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Agora token generated',
              content: { 'application/json': { schema: { '$ref': '#/components/schemas/AgoraToken' } } },
            },
            '400': { description: 'Missing appointmentId' },
            '401': { description: 'Unauthenticated' },
            '403': { description: 'Not a participant in this appointment' },
          },
        },
      },
      '/api/telemedicine/session/{appointmentId}': {
        get: {
          tags: ['Telemedicine'],
          summary: 'Get session details for an appointment',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'appointmentId', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Session info including channel name and Agora App ID' },
            '404': { description: 'No session for this appointment' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
