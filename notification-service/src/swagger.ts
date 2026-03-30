import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description:
        'Event-driven SMS (Twilio) and email (SendGrid) notification service. ' +
        'Consumes RabbitMQ events from Appointment and Payment services. Owned by Member 4.',
      contact: { name: 'Member 4 – Notification & AI Services' },
    },
    servers: [
      { url: 'http://localhost:3007', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        NotificationPreferences: {
          type: 'object',
          properties: {
            emailEnabled: { type: 'boolean', default: true },
            smsEnabled: { type: 'boolean', default: true },
            appointmentReminders: { type: 'boolean', default: true },
            paymentReceipts: { type: 'boolean', default: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Notifications', description: 'Notification management' },
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
                      consumer: { type: 'string', enum: ['connected', 'disconnected', 'stub'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/notifications/preferences': {
        get: {
          tags: ['Notifications'],
          summary: 'Get notification preferences',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Current preferences', content: { 'application/json': { schema: { '$ref': '#/components/schemas/NotificationPreferences' } } } } },
        },
        put: {
          tags: ['Notifications'],
          summary: 'Update notification preferences',
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/NotificationPreferences' } } } },
          responses: { '200': { description: 'Updated preferences' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
