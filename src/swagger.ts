import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { config } from './config/env';

// In production (compiled JS in dist/), __dirname is e.g. /app/dist
// In development (ts-node from src/), __dirname is e.g. /app/src
// We resolve relative to the project root in both cases.
// Dynamically detect if we are running the compiled JS or the TS source
const ext = __filename.endsWith('.ts') ? 'ts' : 'js';

// Force forward slashes for glob patterns so it works correctly on Windows
const modulesGlob = path.join(__dirname, `modules/**/*.routes.${ext}`).replace(/\\/g, '/');
const appFile = path.join(__dirname, `app.${ext}`).replace(/\\/g, '/');

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
        url: 'https://hintro-ai-backened.onrender.com',
        description: 'Production server',
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
  apis: [modulesGlob, appFile],
};

export const swaggerSpec = swaggerJsdoc(options);
