import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',

  database: {
    url: requireEnv('DATABASE_URL'),
  },

  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  gemini: {
    apiKey: requireEnv('GEMINI_API_KEY'),
  },

  resend: {
    apiKey: requireEnv('RESEND_API_KEY'),
    fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  candidate: {
    name: process.env.CANDIDATE_NAME || 'Candidate',
    email: process.env.CANDIDATE_EMAIL || 'candidate@example.com',
    repositoryUrl: process.env.REPOSITORY_URL || '',
    deployedUrl: process.env.DEPLOYED_URL || '',
  },
};
