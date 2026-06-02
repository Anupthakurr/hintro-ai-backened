import { z } from 'zod';

const citationSchema = z.object({
  timestamp: z.string().min(1),
  speaker: z.string().optional(),
  excerpt: z.string().optional(),
});

export const createActionItemSchema = z.object({
  body: z.object({
    task: z.string().min(1, 'Task description is required').max(500),
    assignee: z.string().min(1, 'Assignee name is required'),
    assigneeEmail: z.string().email('Invalid assignee email').optional().nullable(),
    dueDate: z
      .string()
      .datetime({ message: 'dueDate must be a valid ISO 8601 datetime' })
      .optional()
      .nullable(),
    meetingId: z.string().uuid('meetingId must be a valid UUID'),
    citations: z.array(citationSchema).min(1, 'At least one citation is required'),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
      message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED',
    }),
  }),
});

export const listActionItemsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    assignee: z.string().optional(),
    meetingId: z.string().uuid().optional(),
  }),
});

export type CreateActionItemBody = z.infer<typeof createActionItemSchema>['body'];
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>['body'];
export type ListActionItemsQuery = z.infer<typeof listActionItemsSchema>['query'];
