import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description:
        'Event-driven SMS (Twilio) and email (SendGrid) notification service. ' +
        'Consumes RabbitMQ events from Appointment, Payment, and Telemedicine services. Owned by Member 3.',
      contact: { name: 'Member 3 – Telemedicine, Payment & Notification Services' },
    },
    servers: [
      { url: 'http://localhost:3007', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'System', description: 'Health check' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Service health check',
          description: 'Returns health status including RabbitMQ consumer connection state.',
          responses: {
            '200': {
              description: 'Healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      service: { type: 'string', example: 'notification-service' },
                      consumer: { type: 'string', enum: ['active', 'initializing'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
