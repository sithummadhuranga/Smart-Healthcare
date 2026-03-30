import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Appointment Service API',
      version: '1.0.0',
      description:
        'Appointment booking, slot management, and scheduling for the Smart Healthcare Platform. ' +
        'Owned by Member 2. Uses PostgreSQL + RabbitMQ.',
      contact: { name: 'Member 2 – Doctor & Appointment Services' },
    },
    servers: [
      { url: 'http://localhost:3004', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time', example: '2026-04-15T09:30:00Z' },
            durationMinutes: { type: 'integer', example: 30 },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
            consultationFee: { type: 'number', example: 2500 },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BookAppointmentRequest: {
          type: 'object',
          required: ['doctorId', 'scheduledAt'],
          properties: {
            doctorId: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Appointments', description: 'Appointment booking and management' },
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
      '/api/appointments': {
        get: {
          tags: ['Appointments'],
          summary: 'List appointments for current user',
          description: 'Patients see their own appointments. Doctors see appointments assigned to them.',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          ],
          responses: {
            '200': { description: 'Appointment list', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Appointment' } } } } },
            '401': { description: 'Unauthenticated' },
          },
        },
        post: {
          tags: ['Appointments'],
          summary: 'Book a new appointment (patient)',
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/BookAppointmentRequest' } } } },
          responses: {
            '201': { description: 'Appointment booked' },
            '400': { description: 'Validation error or slot conflict' },
            '401': { description: 'Unauthenticated' },
          },
        },
      },
      '/api/appointments/{id}': {
        get: {
          tags: ['Appointments'],
          summary: 'Get appointment by ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Appointment details' }, '404': { description: 'Not found' } },
        },
      },
      '/api/appointments/{id}/cancel': {
        patch: {
          tags: ['Appointments'],
          summary: 'Cancel an appointment',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Cancelled' }, '404': { description: 'Not found' } },
        },
      },
      '/api/appointments/{id}/confirm': {
        patch: {
          tags: ['Appointments'],
          summary: 'Confirm an appointment (doctor)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Confirmed' }, '403': { description: 'Not the assigned doctor' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
