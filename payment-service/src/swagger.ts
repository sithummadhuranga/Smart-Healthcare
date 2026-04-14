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
            id: { type: 'string' },
            appointmentId: { type: 'string' },
            patientId: { type: 'string' },
            amount: { type: 'number', example: 25.00 },
            currency: { type: 'string', example: 'usd' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
            transactionId: { type: 'string', nullable: true },
            stripePaymentIntentId: { type: 'string' },
            stripeChargeId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaymentByAppointmentResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
            transactionId: { type: 'string', nullable: true },
            amount: { type: 'number' },
            currency: { type: 'string' },
            payment: { $ref: '#/components/schemas/Payment' },
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
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['appointmentId'],
                  properties: { appointmentId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '201': { description: 'PaymentIntent created', content: { 'application/json': { schema: { '$ref': '#/components/schemas/PaymentIntent' } } } },
            '400': { description: 'Missing appointmentId' },
            '401': { description: 'Unauthenticated' },
            '403': { description: 'Appointment does not belong to patient' },
            '404': { description: 'Doctor not found for appointment' },
            '503': { description: 'Dependency unavailable' },
          },
        },
      },
      '/api/payments/{appointmentId}': {
        get: {
          tags: ['Payments'],
          summary: 'Get payment details for an appointment',
          security: [{ BearerAuth: [] }],
          parameters: [{ in: 'path', name: 'appointmentId', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Payment record',
              content: { 'application/json': { schema: { '$ref': '#/components/schemas/PaymentByAppointmentResponse' } } },
            },
            '404': { description: 'Payment not found' },
          },
        },
      },
      '/api/payments/admin/all': {
        get: {
          tags: ['Payments'],
          summary: 'Get all payments (admin)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'page', required: false, schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', required: false, schema: { type: 'integer', default: 20 } },
          ],
          responses: { '200': { description: 'Paginated payment list' } },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['Webhooks'],
          summary: 'Stripe webhook endpoint',
          description:
            'Receives Stripe webhook events. Must receive the raw request body (not JSON-parsed) for ' +
            'signature verification. Configure this URL in your Stripe Dashboard. Publishes ' +
            'payment.confirmed events to RabbitMQ for the Notification Service.',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Event received' }, '400': { description: 'Invalid signature' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
