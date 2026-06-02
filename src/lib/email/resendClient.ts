import { Resend } from 'resend';
import { config } from '../../config/env';
import { logger } from '../../config/logger';

const resend = new Resend(config.resend.apiKey);

export interface ReminderEmailOptions {
  to: string;
  task: string;
  assignee: string;
  dueDate?: Date | null;
  meetingTitle: string;
  actionItemId: string;
}

/**
 * Sends an overdue action item reminder email via Resend.
 * Returns { success, errorMessage }.
 */
export async function sendReminderEmail(opts: ReminderEmailOptions): Promise<{
  success: boolean;
  errorMessage?: string;
}> {
  const dueDateStr = opts.dueDate
    ? opts.dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'No due date set';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Action Item Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #dc2626; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Overdue Action Item</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin-top: 0;">Hi ${opts.assignee},</p>
      <p style="color: #6b7280;">You have an overdue action item from <strong>${opts.meetingTitle}</strong>:</p>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #111827;">${opts.task}</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Due: <span style="color: #dc2626; font-weight: 600;">${dueDateStr}</span></p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">Please update the status of this action item at your earliest convenience.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        Action Item ID: ${opts.actionItemId}<br/>
        Sent by Meeting Intelligence Service
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to: opts.to,
      subject: `⚠️ Overdue: ${opts.task}`,
      html,
    });

    if (error) {
      logger.warn('Resend email send error', { error, to: opts.to, task: opts.task });
      return { success: false, errorMessage: error.message };
    }

    logger.info('Reminder email sent', { to: opts.to, task: opts.task });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    logger.error('Resend email exception', { error: err, to: opts.to });
    return { success: false, errorMessage: message };
  }
}
