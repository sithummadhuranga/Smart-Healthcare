import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Service API',
      version: '1.0.0',
      description:
        'Authentication & user management service for the Smart Healthcare Platform. ' +
        'Handles registration, login, JWT issuance/refresh, and admin user management.',
      contact: {
        name: 'Member 1 – Infrastructure Lead',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
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
          description: 'Enter your JWT access token (obtained from POST /api/auth/login)',
        },
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            name: { type: 'string', example: 'John Doe', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 8, example: 'Secret123!' },
            role: { type: 'string', enum: ['patient', 'doctor'], example: 'patient' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'Secret123!' },
          },
        },
        TokenResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token — expires in 15 minutes',
              example: 'eyJhbGciOiJIUzI1NiIs...',
            },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: '663d4f2e7b1e4c001e8f1234' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Descriptive error message' },
          },
        },
        UserAdmin: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Public authentication endpoints' },
      { name: 'User', description: 'Authenticated user profile endpoints' },
      { name: 'Admin', description: 'Admin-only user management endpoints' },
      { name: 'System', description: 'Health & status endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
