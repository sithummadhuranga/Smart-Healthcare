import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Doctor Service API',
      version: '1.0.0',
      description:
        'Doctor profile management, availability scheduling, and appointment acceptance for the Smart Healthcare Platform. ' +
        'Owned by Member 2.',
      contact: { name: 'Member 2 – Doctor & Appointment Services' },
    },
    servers: [
      { url: 'http://localhost:3003', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        DoctorProfile: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            name: { type: 'string', example: 'Dr. Sarah Smith' },
            specialty: { type: 'string', example: 'Cardiology' },
            qualifications: { type: 'array', items: { type: 'string' } },
            bio: { type: 'string' },
            consultationFee: { type: 'number', example: 2500 },
            isAvailable: { type: 'boolean' },
            rating: { type: 'number', format: 'float', example: 4.8 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AvailabilitySlot: {
          type: 'object',
          properties: {
            dayOfWeek: { type: 'integer', minimum: 0, maximum: 6, description: '0=Sunday' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '17:00' },
            slotDurationMinutes: { type: 'integer', example: 30 },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Doctors', description: 'Doctor profile endpoints' },
      { name: 'Availability', description: 'Doctor availability scheduling' },
      { name: 'System', description: 'Health check' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Service health check',
          responses: {
            '200': { description: 'Healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, service: { type: 'string', example: 'doctor-service' } } } } } },
          },
        },
      },
      '/api/doctors': {
        get: {
          tags: ['Doctors'],
          summary: 'List all doctors (public)',
          description: 'Returns verified doctors. Filterable by specialty. No authentication required.',
          parameters: [
            { in: 'query', name: 'specialty', schema: { type: 'string' }, description: 'Filter by medical specialty' },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': { description: 'Doctor list', content: { 'application/json': { schema: { type: 'object', properties: { doctors: { type: 'array', items: { '$ref': '#/components/schemas/DoctorProfile' } }, total: { type: 'integer' } } } } } },
            '501': { description: 'Not yet implemented' },
          },
        },
        post: {
          tags: ['Doctors'],
          summary: 'Create doctor profile',
          description: 'Creates a doctor profile for the authenticated doctor user.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/DoctorProfile' } } },
          },
          responses: {
            '201': { description: 'Profile created' },
            '401': { description: 'Unauthenticated' },
            '403': { description: 'Not a doctor' },
          },
        },
      },
      '/api/doctors/{id}': {
        get: {
          tags: ['Doctors'],
          summary: 'Get doctor by ID (public)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Doctor profile' },
            '404': { description: 'Not found' },
          },
        },
        put: {
          tags: ['Doctors'],
          summary: 'Update doctor profile',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/DoctorProfile' } } } },
          responses: { '200': { description: 'Updated' }, '401': { description: 'Unauthenticated' }, '403': { description: 'Forbidden' } },
        },
      },
      '/api/doctors/profile': {
        get: {
          tags: ['Doctors'],
          summary: 'Get own doctor profile',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Own profile' }, '401': { description: 'Unauthenticated' } },
        },
      },
      '/api/doctors/availability': {
        get: {
          tags: ['Availability'],
          summary: 'Get own availability schedule',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Availability slots' } },
        },
        put: {
          tags: ['Availability'],
          summary: 'Update availability schedule',
          security: [{ BearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { slots: { type: 'array', items: { '$ref': '#/components/schemas/AvailabilitySlot' } } } } } } },
          responses: { '200': { description: 'Updated' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
