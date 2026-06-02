import { z } from 'zod';

export const transcriptEntrySchema = z.object({
  timestamp: z.string().min(1, 'Timestamp is required'),
  speaker: z.string().min(1, 'Speaker is required'),
  text: z.string().min(1, 'Text is required'),
});

export const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Meeting title is required').max(255),
    participants: z
      .array(z.string().email('Each participant must be a valid email'))
      .min(1, 'At least one participant is required'),
    meetingDate: z.string().datetime({ message: 'meetingDate must be a valid ISO 8601 datetime' }),
    transcript: z
      .array(transcriptEntrySchema)
      .min(1, 'Transcript must have at least one entry'),
  }),
});

export const listMeetingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    title: z.string().optional(),
  }),
});

export type CreateMeetingBody = z.infer<typeof createMeetingSchema>['body'];
export type TranscriptEntry = z.infer<typeof transcriptEntrySchema>;
export type ListMeetingsQuery = z.infer<typeof listMeetingsSchema>['query'];
