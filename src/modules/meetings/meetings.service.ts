import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { analyzeMeetingWithAI } from '../../lib/ai/geminiClient';
import { paginate } from '../../utils/response';
import type { CreateMeetingBody, ListMeetingsQuery } from './meetings.schema';

export async function createMeeting(body: CreateMeetingBody, userId: string) {
  const meeting = await prisma.meeting.create({
    data: {
      title: body.title,
      participants: body.participants,
      meetingDate: new Date(body.meetingDate),
      transcript: body.transcript,
      userId,
    },
  });

  return meeting;
}

export async function getMeetingById(id: string, userId: string) {
  const meeting = await prisma.meeting.findFirst({
    where: { id, userId },
    include: { actionItems: true },
  });

  if (!meeting) {
    throw new AppError(404, 'NOT_FOUND', 'Meeting not found');
  }

  return meeting;
}

export async function listMeetings(query: ListMeetingsQuery, userId: string) {
  const { page, limit, title } = query;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(title ? { title: { contains: title, mode: 'insensitive' as const } } : {}),
  };

  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      skip,
      take: limit,
      orderBy: { meetingDate: 'desc' },
      include: { _count: { select: { actionItems: true } } },
    }),
    prisma.meeting.count({ where }),
  ]);

  return paginate(meetings, total, page, limit);
}

export async function analyzeMeeting(id: string, userId: string) {
  const meeting = await prisma.meeting.findFirst({ where: { id, userId } });
  if (!meeting) {
    throw new AppError(404, 'NOT_FOUND', 'Meeting not found');
  }

  const transcript = meeting.transcript as Array<{
    timestamp: string;
    speaker: string;
    text: string;
  }>;

  if (!transcript || transcript.length === 0) {
    throw new AppError(400, 'NO_TRANSCRIPT', 'Meeting has no transcript to analyze');
  }

  // Run AI analysis
  const analysis = await analyzeMeetingWithAI(
    meeting.title,
    meeting.participants,
    meeting.meetingDate.toISOString(),
    transcript
  );

  // Persist AI analysis result and extracted action items in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // Save analysis back to meeting
    const updatedMeeting = await tx.meeting.update({
      where: { id },
      data: {
        analysis: analysis as unknown as Prisma.InputJsonValue,
        analyzedAt: new Date(),
      },
    });

    // Auto-create action items from AI extraction
    if (analysis.actionItems.length > 0) {
      await tx.actionItem.createMany({
        data: analysis.actionItems.map((item) => ({
          task: item.task,
          assignee: item.assignee,
          assigneeEmail: item.assigneeEmail ?? null,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          status: 'PENDING' as const,
          citations: item.citations as unknown as Prisma.InputJsonValue,
          meetingId: id,
        })),
      });
    }

    return updatedMeeting;
  });

  return {
    meetingId: updated.id,
    analyzedAt: updated.analyzedAt,
    analysis,
  };
}
