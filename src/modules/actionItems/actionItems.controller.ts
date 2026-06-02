import { Request, Response, NextFunction } from 'express';
import {
  createActionItemSchema,
  updateStatusSchema,
  listActionItemsSchema,
} from './actionItems.schema';
import {
  createActionItem,
  updateActionItemStatus,
  listActionItems,
  getOverdueActionItems,
} from './actionItems.service';
import { sendSuccess } from '../../utils/response';
import type { JwtPayload } from '../../middleware/auth';

function getUser(res: Response): JwtPayload {
  return res.locals['user'] as JwtPayload;
}

export async function handleCreateActionItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = createActionItemSchema.parse({ body: req.body });
    const item = await createActionItem(body, getUser(res).userId);
    sendSuccess(res, item, 201);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = updateStatusSchema.parse({ body: req.body });
    const item = await updateActionItemStatus(req.params['id'] as string, body, getUser(res).userId);
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
}

export async function handleListActionItems(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = listActionItemsSchema.parse({ query: req.query });
    const result = await listActionItems(query, getUser(res).userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetOverdue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await getOverdueActionItems(getUser(res).userId);
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
}
