import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  handleCreateActionItem,
  handleUpdateStatus,
  handleListActionItems,
  handleGetOverdue,
} from './actionItems.controller';

const router = Router();

/**
 * @openapi
 * /api/action-items:
 *   post:
 *     tags: [Action Items]
 *     summary: Create a new action item manually
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [task, assignee, meetingId, citations]
 *             properties:
 *               task:
 *                 type: string
 *                 example: Prepare release notes
 *               assignee:
 *                 type: string
 *                 example: Alice
 *               assigneeEmail:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: alice@example.com
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-05-25T00:00:00Z"
 *               meetingId:
 *                 type: string
 *                 format: uuid
 *               citations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [timestamp]
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "00:20"
 *                     speaker:
 *                       type: string
 *                     excerpt:
 *                       type: string
 *     responses:
 *       201:
 *         description: Action item created
 *       400:
 *         description: Validation error
 */
router.post('/', authMiddleware, handleCreateActionItem);

/**
 * @openapi
 * /api/action-items/overdue:
 *   get:
 *     tags: [Action Items]
 *     summary: Get all overdue action items (status != COMPLETED and dueDate < now)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of overdue action items
 */
router.get('/overdue', authMiddleware, handleGetOverdue);

/**
 * @openapi
 * /api/action-items:
 *   get:
 *     tags: [Action Items]
 *     summary: List action items with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED]
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *       - in: query
 *         name: meetingId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Paginated list of action items
 */
router.get('/', authMiddleware, handleListActionItems);

/**
 * @openapi
 * /api/action-items/{id}/status:
 *   patch:
 *     tags: [Action Items]
 *     summary: Update the status of an action item
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: Action item status updated
 *       404:
 *         description: Action item not found
 */
router.patch('/:id/status', authMiddleware, handleUpdateStatus);

export default router;
