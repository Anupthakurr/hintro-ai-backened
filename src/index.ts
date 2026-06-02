import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';
import { startReminderScheduler } from './modules/reminders/reminder.scheduler';
import app from './app';

const PORT = config.port;

async function bootstrap(): Promise<void> {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Failed to connect to database', { error: err });
    process.exit(1);
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info(`Meeting Intelligence Service started`, {
      port: PORT,
      env: config.nodeEnv,
      docs: `http://localhost:${PORT}/api/docs`,
    });
  });

  // Start the reminder cron scheduler
  startReminderScheduler();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server and database connections closed');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Prevent crashes from unhandled rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err });
    process.exit(1);
  });
}

bootstrap();
