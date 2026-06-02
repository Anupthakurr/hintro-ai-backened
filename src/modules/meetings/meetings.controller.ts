import { Request, Response, NextFunction } from 'express';
import { createMeetingSchema, listMeetingsSchema } from './meetings.schema';
import {
  createMeeting,
  getMeetingById,
  listMeetings,
  analyzeMeeting,
} from './meetings.service';
import { sendSuccess } from '../../utils/response';
import type { JwtPayload } from '../../middleware/auth';

function getUser(res: Response): JwtPayload {
  return res.locals['user'] as JwtPayload;
}

export async function handleCreateMeeting(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = createMeetingSchema.parse({ body: req.body });
    const meeting = await createMeeting(body, getUser(res).userId);
    sendSuccess(res, meeting, 201);
  } catch (err) {
    next(err);
  }
}

export async function handleGetMeeting(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const meeting = await getMeetingById(req.params['id'] as string, getUser(res).userId);
    sendSuccess(res, meeting);
  } catch (err) {
    next(err);
  }
}

export async function handleListMeetings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = listMeetingsSchema.parse({ query: req.query });
    const result = await listMeetings(query, getUser(res).userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function handleAnalyzeMeeting(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await analyzeMeeting(req.params['id'] as string, getUser(res).userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
