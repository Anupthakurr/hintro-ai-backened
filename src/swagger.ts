import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Intelligence Service API',
      version: '1.0.0',
      description:
        'AI-powered meeting intelligence service that helps users capture insights, action items, decisions, and follow-ups from conversations.',
      contact: {
        name: config.candidate.name,
        email: config.candidate.email,
      },
    },
    servers: [
      {
        url: config.candidate.deployedUrl || `http://localhost:${config.port}`,
        description: 'Primary server',
      },
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/auth/login',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Meetings', description: 'Meeting management and AI analysis' },
      { name: 'Action Items', description: 'Action item management and overdue tracking' },
      { name: 'System', description: 'Health check and evaluation metadata' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
