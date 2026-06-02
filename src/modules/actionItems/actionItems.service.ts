import { ActionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { paginate } from '../../utils/response';
import type {
  CreateActionItemBody,
  UpdateStatusBody,
  ListActionItemsQuery,
} from './actionItems.schema';

export async function createActionItem(body: CreateActionItemBody, userId: string) {
  // Verify meeting belongs to user
  const meeting = await prisma.meeting.findFirst({
    where: { id: body.meetingId, userId },
  });
  if (!meeting) {
    throw new AppError(404, 'MEETING_NOT_FOUND', 'Meeting not found or not accessible');
  }

  const item = await prisma.actionItem.create({
    data: {
      task: body.task,
      assignee: body.assignee,
      assigneeEmail: body.assigneeEmail ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: 'PENDING',
      citations: body.citations,
      meetingId: body.meetingId,
    },
    include: { meeting: { select: { title: true } } },
  });

  return item;
}

export async function updateActionItemStatus(
  id: string,
  body: UpdateStatusBody,
  userId: string
) {
  // Verify action item belongs to a meeting owned by user
  const item = await prisma.actionItem.findFirst({
    where: { id, meeting: { userId } },
  });
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Action item not found');
  }

  const updated = await prisma.actionItem.update({
    where: { id },
    data: { status: body.status as ActionStatus },
    include: { meeting: { select: { title: true } } },
  });

  return updated;
}

export async function listActionItems(query: ListActionItemsQuery, userId: string) {
  const { page, limit, status, assignee, meetingId } = query;
  const skip = (page - 1) * limit;

  const where = {
    meeting: { userId },
    ...(status ? { status: status as ActionStatus } : {}),
    ...(assignee ? { assignee: { contains: assignee, mode: 'insensitive' as const } } : {}),
    ...(meetingId ? { meetingId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { meeting: { select: { title: true } } },
    }),
    prisma.actionItem.count({ where }),
  ]);

  return paginate(items, total, page, limit);
}

export async function getOverdueActionItems(userId: string) {
  const now = new Date();

  const items = await prisma.actionItem.findMany({
    where: {
      meeting: { userId },
      status: { not: ActionStatus.COMPLETED },
      dueDate: { lt: now },
    },
    orderBy: { dueDate: 'asc' },
    include: {
      meeting: { select: { title: true } },
      reminders: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
  });

  return items;
}
