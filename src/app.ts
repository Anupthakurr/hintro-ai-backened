import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env';
import { traceIdMiddleware } from './middleware/traceId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess, sendError } from './utils/response';
import { swaggerSpec } from './swagger';

import authRoutes from './modules/auth/auth.routes';
import meetingsRoutes from './modules/meetings/meetings.routes';
import actionItemsRoutes from './modules/actionItems/actionItems.routes';

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────
// Disable CSP for /api/docs so swagger-ui scripts/styles load correctly
app.use('/api/docs', (_req, _res, next) => {
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
    exposedHeaders: ['X-Trace-Id'],
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Observability ────────────────────────────────────────────────────────────
app.use(traceIdMiddleware);
app.use(requestLoggerMiddleware);

// ─── API Documentation ────────────────────────────────────────────────────────
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Meeting Intelligence Service — API Docs',
  })
);

// Expose raw OpenAPI JSON
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── System Endpoints ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP' });
});

/**
 * @openapi
 * /api/evaluation:
 *   get:
 *     tags: [System]
 *     summary: Evaluation metadata endpoint
 *     responses:
 *       200:
 *         description: Candidate and submission details
 */
app.get('/api/evaluation', (_req: Request, res: Response) => {
  sendSuccess(res, {
    candidateName: config.candidate.name,
    email: config.candidate.email,
    repositoryUrl: config.candidate.repositoryUrl,
    deployedUrl: config.candidate.deployedUrl,
    externalIntegration: 'Resend (Email API)',
    features: [
      'JWT Authentication',
      'Meeting Management with Pagination',
      'AI Analysis via Gemini 2.0 Flash',
      'Grounded Citations with Hallucination Prevention',
      'Action Item Management',
      'Overdue Detection',
      'Scheduled Reminder Job (node-cron, hourly)',
      'Resend Email Integration',
      'Unified API Response Format',
      'Request Trace ID',
      'Structured Logging (Winston)',
      'Input Validation (Zod)',
      'Global Error Handling',
      'Swagger/OpenAPI Documentation',
      'Docker Support',
    ],
  });
});

// ─── Feature Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/action-items', actionItemsRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
