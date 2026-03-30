import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Patient Service API',
      version: '1.0.0',
      description:
        'Patient profile management, medical report uploads, prescriptions, and medical history for the Smart Healthcare Platform.',
      contact: {
        name: 'Member 1 – Infrastructure Lead',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Direct service (dev)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Via API Gateway (recommended)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from POST /api/auth/login',
        },
      },
      schemas: {
        PatientProfile: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string', description: 'Auth service user ID' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '+94771234567' },
            dateOfBirth: { type: 'string', format: 'date', example: '1990-05-15' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            address: { type: 'string' },
            bloodType: {
              type: 'string',
              enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            },
            allergies: { type: 'array', items: { type: 'string' } },
            emergencyContact: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                relationship: { type: 'string' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            phone: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            address: { type: 'string' },
            bloodType: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
            allergies: { type: 'array', items: { type: 'string' } },
            emergencyContact: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                relationship: { type: 'string' },
              },
            },
          },
        },
        MedicalReport: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            patientId: { type: 'string' },
            title: { type: 'string', example: 'Blood Test Results' },
            description: { type: 'string' },
            fileUrl: { type: 'string', format: 'uri', description: 'Cloudinary CDN URL' },
            fileType: { type: 'string', enum: ['pdf', 'image'] },
            uploadedAt: { type: 'string', format: 'date-time' },
          },
        },
        Prescription: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            patientId: { type: 'string' },
            doctorId: { type: 'string' },
            doctorName: { type: 'string' },
            medications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
            notes: { type: 'string' },
            issuedAt: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Descriptive error message' },
          },
        },
      },
    },
    tags: [
      { name: 'Profile', description: 'Patient profile management' },
      { name: 'Reports', description: 'Medical report upload and retrieval' },
      { name: 'Prescriptions', description: 'Prescription management' },
      { name: 'Admin', description: 'Admin-only patient management' },
      { name: 'System', description: 'Health & status endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
