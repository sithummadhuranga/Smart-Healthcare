import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Service API',
      version: '1.0.0',
      description:
        'Stripe payment processing for appointment consultations. Uses Stripe Sandbox (no real money). ' +
        'Owned by Member 3.',
      contact: { name: 'Member 3 – Payment & Telemedicine Services' },
    },
    servers: [
      { url: 'http://localhost:3006', description: 'Direct service (dev)' },
      { url: 'http://localhost:3000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        PaymentIntent: {
          type: 'object',
          properties: {
            clientSecret: { type: 'string', description: 'Stripe PaymentIntent client secret for Stripe Elements' },
            paymentIntentId: { type: 'string' },
            amount: { type: 'integer', description: 'Amount in smallest currency unit (cents)' },
            currency: { type: 'string', example: 'usd' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            appointmentId: { type: 'integer' },
            patientId: { type: 'string' },
            amount: { type: 'number', example: 25.00 },
            currency: { type: 'string', example: 'usd' },
            status: { type: 'string', enum: ['pending', 'succeeded', 'failed', 'refunded'] },
            stripePaymentIntentId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    tags: [
      { name: 'Payments', description: 'Payment processing endpoints' },
      { name: 'Webhooks', description: 'Stripe webhook handlers' },
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
      '/api/payments/intent': {
        post: {
          tags: ['Payments'],
          summary: 'Create a Stripe PaymentIntent',
          description: 'Creates a PaymentIntent for the appointment consultation fee. Returns clientSecret for Stripe Elements.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['appointmentId'], properties: { appointmentId: { type: 'integer' } } } } },
          },
          responses: {
            '201': { description: 'PaymentIntent created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PaymentIntent' } } } },
            '400': { description: 'Missing appointmentId' },
            '401': { description: 'Unauthenticated' },
          },
        },
      },
      '/api/payments': {
        get: {
          tags: ['Payments'],
          summary: 'Get payment history for current patient',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': { description: 'Payment list', content: { 'application/json': { schema: { type: 'array', items: { '$ref': '#/components/schemas/Payment' } } } } },
          },
        },
      },
      '/api/payments/{id}': {
        get: {
          tags: ['Payments'],
          summary: 'Get payment by ID',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Payment record' }, '404': { description: 'Not found' } },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['Webhooks'],
          summary: 'Stripe webhook endpoint',
          description:
            'Receives Stripe webhook events. Must receive the raw request body (not JSON-parsed) for ' +
            'signature verification. Configure this URL in your Stripe Dashboard. Publishes ' +
            'payment.succeeded events to RabbitMQ for the Notification Service.',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Event received' }, '400': { description: 'Invalid signature' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
