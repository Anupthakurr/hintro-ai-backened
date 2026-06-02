import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../middleware/errorHandler';
import type { TranscriptEntry } from '../../modules/meetings/meetings.schema';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export interface Citation {
  timestamp: string;
  speaker?: string;
  excerpt?: string;
}

export interface SummaryPoint {
  text: string;
  citations: Citation[];
}

export interface ActionItemAI {
  task: string;
  assignee: string;
  assigneeEmail?: string;
  dueDate?: string;
  citations: Citation[];
}

export interface Decision {
  text: string;
  citations: Citation[];
}

export interface FollowUp {
  text: string;
  citations: Citation[];
}

export interface MeetingAnalysis {
  summary: SummaryPoint[];
  actionItems: ActionItemAI[];
  decisions: Decision[];
  followUpSuggestions: FollowUp[];
}

function buildPrompt(
  title: string,
  participants: string[],
  meetingDate: string,
  transcript: TranscriptEntry[]
): string {
  const transcriptText = transcript
    .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
    .join('\n');

  const validTimestamps = transcript.map((t) => t.timestamp);

  return `You are a precise meeting analyst. Your task is to extract insights from the meeting transcript below.

STRICT RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. ONLY use information explicitly stated in the transcript. Do NOT infer, assume, or add information not present.
2. For EVERY insight you generate (summary point, action item, decision, follow-up), you MUST include at least one citation with a timestamp that appears VERBATIM in the transcript.
3. Valid timestamps you may cite: ${JSON.stringify(validTimestamps)}
4. Do NOT invent attendees, tasks, decisions, or outcomes not mentioned in the transcript.
5. If you cannot ground an insight in the transcript, OMIT it entirely.
6. For assignee names in action items, only use speakers mentioned in the transcript.
7. Return ONLY valid JSON. No markdown, no explanation text.

MEETING DETAILS:
Title: ${title}
Date: ${meetingDate}
Participants (registered emails): ${participants.join(', ')}

TRANSCRIPT:
${transcriptText}

Return a JSON object with this EXACT structure:
{
  "summary": [
    {
      "text": "One sentence describing something explicitly stated in the transcript",
      "citations": [{"timestamp": "<exact timestamp from transcript>", "speaker": "<speaker name>", "excerpt": "<short quote>"}]
    }
  ],
  "actionItems": [
    {
      "task": "Specific task explicitly mentioned",
      "assignee": "Name of person who said they would do it (from transcript speakers only)",
      "assigneeEmail": null,
      "dueDate": null,
      "citations": [{"timestamp": "<exact timestamp from transcript>", "speaker": "<speaker name>", "excerpt": "<short quote>"}]
    }
  ],
  "decisions": [
    {
      "text": "A decision explicitly made in the meeting",
      "citations": [{"timestamp": "<exact timestamp from transcript>", "speaker": "<speaker name>", "excerpt": "<short quote>"}]
    }
  ],
  "followUpSuggestions": [
    {
      "text": "A follow-up suggestion based on what was explicitly discussed",
      "citations": [{"timestamp": "<exact timestamp from transcript>", "speaker": "<speaker name>", "excerpt": "<short quote>"}]
    }
  ]
}

Remember: every array can be empty [] if nothing is grounded. Better to return fewer items than to hallucinate.`;
}

/**
 * Validates that all citations in the analysis reference timestamps
 * that actually exist in the original transcript.
 */
function validateCitations(
  analysis: MeetingAnalysis,
  transcript: TranscriptEntry[]
): MeetingAnalysis {
  const validTimestamps = new Set(transcript.map((t) => t.timestamp));

  function filterCitations(citations: Citation[]): Citation[] {
    return citations.filter((c) => {
      if (!validTimestamps.has(c.timestamp)) {
        logger.warn(`Filtered out hallucinated citation timestamp: ${c.timestamp}`);
        return false;
      }
      return true;
    });
  }

  function itemHasValidCitations<T extends { citations: Citation[] }>(item: T): boolean {
    return item.citations.length > 0;
  }

  const validated: MeetingAnalysis = {
    summary: analysis.summary
      .map((s) => ({ ...s, citations: filterCitations(s.citations) }))
      .filter(itemHasValidCitations),

    actionItems: analysis.actionItems
      .map((a) => ({ ...a, citations: filterCitations(a.citations) }))
      .filter(itemHasValidCitations),

    decisions: analysis.decisions
      .map((d) => ({ ...d, citations: filterCitations(d.citations) }))
      .filter(itemHasValidCitations),

    followUpSuggestions: analysis.followUpSuggestions
      .map((f) => ({ ...f, citations: filterCitations(f.citations) }))
      .filter(itemHasValidCitations),
  };

  return validated;
}

/**
 * Analyzes a meeting transcript using Gemini AI.
 * Returns grounded, citation-backed insights.
 * All citations are validated against the original transcript before returning.
 */
export async function analyzeMeetingWithAI(
  title: string,
  participants: string[],
  meetingDate: string,
  transcript: TranscriptEntry[]
): Promise<MeetingAnalysis> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Low temperature for factual, grounded outputs
    },
  });

  const prompt = buildPrompt(title, participants, meetingDate, transcript);

  logger.info('Sending transcript to Gemini for analysis', {
    transcriptEntries: transcript.length,
    title,
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let analysis: MeetingAnalysis;
    try {
      analysis = JSON.parse(text) as MeetingAnalysis;
    } catch {
      logger.error('Failed to parse Gemini response as JSON', { responseText: text });
      throw new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse AI analysis response');
    }

    // Validate and filter citations against the real transcript
    const validated = validateCitations(analysis, transcript);

    logger.info('Gemini analysis complete', {
      summaryPoints: validated.summary.length,
      actionItems: validated.actionItems.length,
      decisions: validated.decisions.length,
      followUps: validated.followUpSuggestions.length,
    });

    return validated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Gemini API error', { error: err });
    throw new AppError(502, 'AI_SERVICE_ERROR', 'AI analysis service is currently unavailable');
  }
}
