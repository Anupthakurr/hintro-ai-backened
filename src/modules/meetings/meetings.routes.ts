import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  handleCreateMeeting,
  handleGetMeeting,
  handleListMeetings,
  handleAnalyzeMeeting,
} from './meetings.controller';

const router = Router();

/**
 * @openapi
 * /api/meetings:
 *   post:
 *     tags: [Meetings]
 *     summary: Create a new meeting with transcript
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, participants, meetingDate, transcript]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Sprint Planning
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 example: ["alice@example.com", "bob@example.com"]
 *               meetingDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-20T10:00:00Z"
 *               transcript:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [timestamp, speaker, text]
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "00:10"
 *                     speaker:
 *                       type: string
 *                       example: John
 *                     text:
 *                       type: string
 *                       example: We should launch next Friday.
 *     responses:
 *       201:
 *         description: Meeting created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, handleCreateMeeting);

/**
 * @openapi
 * /api/meetings:
 *   get:
 *     tags: [Meetings]
 *     summary: List meetings (paginated)
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
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (case-insensitive contains)
 *     responses:
 *       200:
 *         description: Paginated list of meetings
 */
router.get('/', authMiddleware, handleListMeetings);

/**
 * @openapi
 * /api/meetings/{id}:
 *   get:
 *     tags: [Meetings]
 *     summary: Get a meeting by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meeting details including action items
 *       404:
 *         description: Meeting not found
 */
router.get('/:id', authMiddleware, handleGetMeeting);

/**
 * @openapi
 * /api/meetings/{id}/analyze:
 *   post:
 *     tags: [Meetings]
 *     summary: Analyze a meeting transcript using AI (Gemini)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI analysis result with grounded citations
 *       404:
 *         description: Meeting not found
 *       502:
 *         description: AI service error
 */
router.post('/:id/analyze', authMiddleware, handleAnalyzeMeeting);

export default router;
