import request from 'supertest';
import app from '../src/app';

/**
 * Auth API integration tests.
 * These tests run against the actual app (no mocks for middleware).
 * DB calls are mocked via jest.mock.
 */

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../src/config/env', () => ({
  config: {
    port: 3001,
    nodeEnv: 'test',
    isDevelopment: false,
    database: { url: 'postgresql://test' },
    jwt: { secret: 'test-secret', expiresIn: '1h' },
    gemini: { apiKey: 'test' },
    resend: { apiKey: 'test', fromEmail: 'test@example.com' },
    cors: { origin: '*' },
    candidate: {
      name: 'Test',
      email: 'test@example.com',
      repositoryUrl: '',
      deployedUrl: '',
    },
  },
}));

// Mock logger to suppress output during tests
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
  getTraceLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  }),
}));

const { prisma } = require('../src/lib/prisma');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with user and token on valid input', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'securepass123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
    expect(res.body.traceId).toBeDefined();
  });

  it('returns 400 if email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'not-an-email',
      password: 'securepass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if name is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'alice@example.com',
      password: 'securepass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 if email already taken', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'securepass123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /health', () => {
  it('returns status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});

describe('GET /api/evaluation', () => {
  it('returns evaluation metadata', async () => {
    const res = await request(app).get('/api/evaluation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.features).toBeInstanceOf(Array);
    expect(res.body.data.features.length).toBeGreaterThan(0);
  });
});

describe('Non-existent routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
