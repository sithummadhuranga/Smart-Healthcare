import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Doctor Service API',
      version: '1.1.0',
      description:
        'Doctor profile management, availability scheduling, and appointment acceptance for the Smart Healthcare Platform. ' +
        'Owned by Member 2.',
      contact: { name: 'Member 2 - Doctor & Appointment Services' },
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
            verificationReason: { type: 'string' },
            isAvailable: { type: 'boolean' },
            isVerified: { type: 'boolean' },
            availableSlots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slotId: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                  startTime: { type: 'string', example: '09:00' },
                  endTime: { type: 'string', example: '09:30' },
                  isBooked: { type: 'boolean' },
                },
              },
            },
            rating: { type: 'number', format: 'float', example: 4.8 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DoctorPublicProfile: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            specialty: { type: 'string' },
            bio: { type: 'string' },
            consultationFee: { type: 'number' },
            isVerified: { type: 'boolean' },
            availableSlots: { type: 'array', items: { type: 'object' } },
          },
        },
        DoctorProfileUpdateRequest: {
          type: 'object',
          required: ['specialty', 'bio', 'consultationFee', 'qualifications'],
          properties: {
            specialty: { type: 'string' },
            bio: { type: 'string' },
            consultationFee: { type: 'number' },
            qualifications: { type: 'array', items: { type: 'string' } },
          },
        },
        ScheduleSlotRequest: {
          type: 'object',
          required: ['date', 'startTime', 'endTime'],
          properties: {
            date: { type: 'string', format: 'date' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '09:30' },
          },
        },
        AvailabilitySlot: {
          type: 'object',
          properties: {
            slotId: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            startTime: { type: 'string', example: '09:00' },
            endTime: { type: 'string', example: '17:00' },
            isBooked: { type: 'boolean' },
          },
        },
        Prescription: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            doctorId: { type: 'string' },
            patientId: { type: 'string' },
            appointmentId: { type: 'string' },
            medications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                },
              },
            },
            notes: { type: 'string' },
            issuedAt: { type: 'string', format: 'date-time' },
          },
        },
        VerifyDoctorRequest: {
          type: 'object',
          required: ['verified'],
          properties: {
            verified: { type: 'boolean' },
            reason: { type: 'string' },
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
      { name: 'Schedule', description: 'Doctor schedule slot management' },
      { name: 'Prescriptions', description: 'Doctor digital prescriptions' },
      { name: 'Admin', description: 'Admin doctor verification endpoints' },
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
          ],
          responses: {
            '200': {
              description: 'Doctor list',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/DoctorPublicProfile' } },
                },
              },
            },
          },
        },
      },
      '/api/doctors/{id}': {
        get: {
          tags: ['Doctors'],
          summary: 'Get doctor by ID (public)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Doctor profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/DoctorPublicProfile' } } } },
            '404': { description: 'Not found' },
          },
        },
      },
      '/api/doctors/profile': {
        get: {
          tags: ['Doctors'],
          summary: 'Get own doctor profile',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Own profile' }, '401': { description: 'Unauthenticated' } },
        },
        put: {
          tags: ['Doctors'],
          summary: 'Update own doctor profile',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DoctorProfileUpdateRequest' } },
            },
          },
          responses: {
            '200': { description: 'Profile updated' },
            '400': { description: 'Validation error' },
            '401': { description: 'Unauthenticated' },
            '403': { description: 'Not a doctor' },
          },
        },
      },
      '/api/doctors/schedule': {
        get: {
          tags: ['Schedule'],
          summary: 'Get own schedule slots',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Availability slots' } },
        },
        post: {
          tags: ['Schedule'],
          summary: 'Add schedule slot',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ScheduleSlotRequest' } },
            },
          },
          responses: { '201': { description: 'Slot created' }, '409': { description: 'Duplicate slot' } },
        },
      },
      '/api/doctors/schedule/{slotId}': {
        delete: {
          tags: ['Schedule'],
          summary: 'Delete schedule slot',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'slotId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Slot removed' },
            '404': { description: 'Slot not found' },
            '409': { description: 'Slot already booked' },
          },
        },
      },
      '/api/doctors/prescriptions': {
        get: {
          tags: ['Prescriptions'],
          summary: 'List prescriptions issued by current doctor',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'Prescriptions',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Prescription' } },
                },
              },
            },
          },
        },
        post: {
          tags: ['Prescriptions'],
          summary: 'Create digital prescription',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['patientId', 'appointmentId', 'medications'],
                  properties: {
                    patientId: { type: 'string' },
                    appointmentId: { type: 'string' },
                    medications: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['name', 'dosage', 'frequency'],
                        properties: {
                          name: { type: 'string' },
                          dosage: { type: 'string' },
                          frequency: { type: 'string' },
                        },
                      },
                    },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Prescription created' }, '400': { description: 'Validation error' } },
        },
      },
      '/api/doctors/patients/{patientId}/reports': {
        get: {
          tags: ['Prescriptions'],
          summary: 'Get patient reports (doctor view)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'patientId', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Medical reports' }, '404': { description: 'Patient not found' } },
        },
      },
      '/api/doctors/pending': {
        get: {
          tags: ['Admin'],
          summary: 'List pending doctor verifications (admin)',
          security: [{ BearerAuth: [] }],
          responses: { '200': { description: 'Pending doctors' }, '403': { description: 'Forbidden' } },
        },
      },
      '/api/doctors/{id}/verify': {
        patch: {
          tags: ['Admin'],
          summary: 'Verify or reject doctor account (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyDoctorRequest' } } },
          },
          responses: { '200': { description: 'Verification updated' }, '404': { description: 'Doctor not found' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
