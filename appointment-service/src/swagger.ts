import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Appointment Service API',
      version: '1.1.0',
      description:
        'Appointment booking, modify/cancel workflows, status transitions, and admin listing for the Smart Healthcare Platform. ' +
        'Owned by Member 2. Uses PostgreSQL + RabbitMQ.',
      contact: { name: 'Member 2 - Doctor & Appointment Services' },
    },
    servers: [
      { url: 'http://localhost:3004', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        InternalApiKey: { type: 'apiKey', in: 'header', name: 'x-internal-api-key' },
      },
      schemas: {
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'f2d71a4d-1a31-4fb2-95f7-7ad86b4f20aa' },
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            slotId: { type: 'string' },
            reason: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
            },
            rejectionReason: { type: 'string', nullable: true },
            scheduledAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BookAppointmentRequest: {
          type: 'object',
          required: ['doctorId', 'slotId'],
          properties: {
            doctorId: { type: 'string' },
            slotId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        ModifyAppointmentRequest: {
          type: 'object',
          required: ['doctorId', 'slotId'],
          properties: {
            doctorId: { type: 'string' },
            slotId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        RejectAppointmentRequest: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
          },
        },
        AdminAppointmentListResponse: {
          type: 'object',
          properties: {
            appointments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Appointment' },
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Appointments', description: 'Appointment booking and status management' },
      { name: 'Admin', description: 'Admin appointment endpoints' },
      { name: 'Internal', description: 'Internal service-to-service endpoints' },
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
            {
              in: 'query',
              name: 'status',
              schema: {
                type: 'string',
                enum: ['PENDING', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
              },
            },
          ],
          responses: {
            '200': {
              description: 'Appointment list',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                },
              },
            },
            '401': { description: 'Unauthenticated' },
          },
        },
        post: {
          tags: ['Appointments'],
          summary: 'Book a new appointment (patient)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/BookAppointmentRequest' } } },
          },
          responses: {
            '201': { description: 'Appointment booked' },
            '400': { description: 'Validation error' },
            '401': { description: 'Unauthenticated' },
            '409': { description: 'Slot already booked' },
          },
        },
      },
      '/api/appointments/admin/all': {
        get: {
          tags: ['Admin'],
          summary: 'List all appointments (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
            {
              in: 'query',
              name: 'status',
              schema: {
                type: 'string',
                enum: ['PENDING', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
              },
            },
          ],
          responses: {
            '200': {
              description: 'Admin appointment page',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AdminAppointmentListResponse' },
                },
              },
            },
            '401': { description: 'Unauthenticated' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/appointments/{id}': {
        get: {
          tags: ['Appointments'],
          summary: 'Get appointment by ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Appointment details' }, '404': { description: 'Not found' } },
        },
      },
      '/api/appointments/{id}/modify': {
        patch: {
          tags: ['Appointments'],
          summary: 'Modify/reschedule appointment (patient)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ModifyAppointmentRequest' } },
            },
          },
          responses: {
            '200': { description: 'Appointment modified' },
            '400': { description: 'Invalid transition or payload' },
            '403': { description: 'Not owner' },
            '409': { description: 'Slot conflict' },
          },
        },
      },
      '/api/appointments/{id}/cancel': {
        patch: {
          tags: ['Appointments'],
          summary: 'Cancel an appointment (patient)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Cancelled' },
            '400': { description: 'Invalid transition' },
            '403': { description: 'Not owner' },
            '404': { description: 'Not found' },
          },
        },
      },
      '/api/appointments/{id}/accept': {
        patch: {
          tags: ['Appointments'],
          summary: 'Accept an appointment (doctor)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Accepted/confirmed' }, '403': { description: 'Not assigned doctor' } },
        },
      },
      '/api/appointments/{id}/reject': {
        patch: {
          tags: ['Appointments'],
          summary: 'Reject an appointment (doctor)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RejectAppointmentRequest' } },
            },
          },
          responses: { '200': { description: 'Rejected' }, '403': { description: 'Not assigned doctor' } },
        },
      },
      '/api/appointments/{id}/complete': {
        patch: {
          tags: ['Appointments'],
          summary: 'Complete an appointment (doctor)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Completed' }, '400': { description: 'Invalid transition' } },
        },
      },
      '/api/appointments/{id}/pay': {
        patch: {
          tags: ['Internal'],
          summary: 'Mark appointment paid (internal)',
          security: [{ InternalApiKey: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Marked paid' }, '400': { description: 'Invalid transition' } },
        },
      },
      '/api/appointments/{id}/start': {
        patch: {
          tags: ['Internal'],
          summary: 'Start appointment (internal)',
          security: [{ InternalApiKey: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Marked in progress' }, '400': { description: 'Invalid transition' } },
        },
      },
      '/api/appointments/{id}/prescription-issued': {
        post: {
          tags: ['Internal'],
          summary: 'Publish prescription issued notification event (internal)',
          security: [{ InternalApiKey: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Event published' }, '404': { description: 'Appointment not found' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
