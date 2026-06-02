import cron from 'node-cron';
import { ActionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { sendReminderEmail } from '../../lib/email/resendClient';
import { logger } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Finds all overdue action items (status != COMPLETED, dueDate < now)
 * and sends reminder emails via Resend.
 * Records each reminder attempt in the Reminder table.
 */
export async function runReminderJob(): Promise<void> {
  const traceId = uuidv4();
  const jobLogger = logger.child({ traceId, job: 'reminder-scheduler' });

  jobLogger.info('Starting reminder job');

  const now = new Date();

  let overdueItems;
  try {
    overdueItems = await prisma.actionItem.findMany({
      where: {
        status: { not: ActionStatus.COMPLETED },
        dueDate: { lt: now },
      },
      include: {
        meeting: { select: { title: true } },
      },
    });
  } catch (err) {
    jobLogger.error('Failed to fetch overdue action items', { error: err });
    return;
  }

  jobLogger.info(`Found ${overdueItems.length} overdue action item(s)`);

  if (overdueItems.length === 0) {
    return;
  }

  for (const item of overdueItems) {
    const recipient = item.assigneeEmail ?? null;

    if (!recipient) {
      jobLogger.warn('Skipping item — no assigneeEmail set', {
        actionItemId: item.id,
        assignee: item.assignee,
        task: item.task,
      });
      continue;
    }

    jobLogger.info('Sending reminder', {
      actionItemId: item.id,
      assignee: item.assignee,
      to: recipient,
      task: item.task,
    });

    const result = await sendReminderEmail({
      to: recipient,
      task: item.task,
      assignee: item.assignee,
      dueDate: item.dueDate,
      meetingTitle: item.meeting.title,
      actionItemId: item.id,
    });

    // Record reminder attempt in database
    try {
      await prisma.reminder.create({
        data: {
          actionItemId: item.id,
          channel: 'email',
          recipient,
          success: result.success,
          errorMessage: result.errorMessage ?? null,
        },
      });
    } catch (err) {
      jobLogger.error('Failed to record reminder history', { error: err, actionItemId: item.id });
    }

    if (result.success) {
      jobLogger.info('Reminder sent successfully', { actionItemId: item.id, to: recipient });
    } else {
      jobLogger.warn('Reminder failed', {
        actionItemId: item.id,
        to: recipient,
        error: result.errorMessage,
      });
    }
  }

  jobLogger.info('Reminder job complete', {
    processed: overdueItems.length,
    withEmail: overdueItems.filter((i) => i.assigneeEmail).length,
  });
}

/**
 * Starts the reminder cron job.
 * Runs every hour: 0 * * * *
 * Also runs immediately on startup in non-test environments.
 */
export function startReminderScheduler(): void {
  logger.info('Starting reminder scheduler (every hour)');

  // Schedule: every hour on the hour
  cron.schedule('0 * * * *', async () => {
    try {
      await runReminderJob();
    } catch (err) {
      logger.error('Unhandled error in reminder job', { error: err });
    }
  });

  // Run immediately on startup so you can verify it's working
  if (process.env.NODE_ENV !== 'test') {
    setTimeout(async () => {
      try {
        await runReminderJob();
      } catch (err) {
        logger.error('Startup reminder job failed', { error: err });
      }
    }, 5000); // 5s delay to let DB connect first
  }
}
