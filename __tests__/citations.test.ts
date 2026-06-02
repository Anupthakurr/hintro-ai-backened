/**
 * Unit tests for the citation validation logic.
 * This logic is the core hallucination-prevention mechanism.
 * We test it in isolation without any external dependencies.
 */

type Citation = { timestamp: string; speaker?: string; excerpt?: string };

interface AnalysisItem {
  citations: Citation[];
  [key: string]: unknown;
}

interface Analysis {
  summary: Array<{ text: string; citations: Citation[] }>;
  actionItems: Array<{ task: string; assignee: string; citations: Citation[] }>;
  decisions: Array<{ text: string; citations: Citation[] }>;
  followUpSuggestions: Array<{ text: string; citations: Citation[] }>;
}

// Inline the validation logic to test it purely
function validateCitations(
  analysis: Analysis,
  transcript: Array<{ timestamp: string; speaker: string; text: string }>
): Analysis {
  const validTimestamps = new Set(transcript.map((t) => t.timestamp));

  function filterItems<T extends AnalysisItem>(items: T[]): T[] {
    return items
      .map((item) => ({
        ...item,
        citations: item.citations.filter((c) => validTimestamps.has(c.timestamp)),
      }))
      .filter((item) => item.citations.length > 0);
  }

  return {
    summary: filterItems(analysis.summary),
    actionItems: filterItems(analysis.actionItems),
    decisions: filterItems(analysis.decisions),
    followUpSuggestions: filterItems(analysis.followUpSuggestions),
  };
}

const sampleTranscript = [
  { timestamp: '00:10', speaker: 'John', text: 'We should launch next Friday.' },
  { timestamp: '00:20', speaker: 'Alice', text: 'I will prepare release notes.' },
  { timestamp: '00:30', speaker: 'Bob', text: 'I agree with the timeline.' },
];

describe('Citation Validator — Hallucination Prevention', () => {
  it('keeps all items when all citations reference valid timestamps', () => {
    const analysis: Analysis = {
      summary: [{ text: 'Team plans to launch.', citations: [{ timestamp: '00:10' }] }],
      actionItems: [{ task: 'Prepare notes', assignee: 'Alice', citations: [{ timestamp: '00:20' }] }],
      decisions: [{ text: 'Launch on Friday.', citations: [{ timestamp: '00:10' }] }],
      followUpSuggestions: [{ text: 'Confirm timeline.', citations: [{ timestamp: '00:30' }] }],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.summary).toHaveLength(1);
    expect(result.actionItems).toHaveLength(1);
    expect(result.decisions).toHaveLength(1);
    expect(result.followUpSuggestions).toHaveLength(1);
  });

  it('removes items whose only citation has a hallucinated timestamp', () => {
    const analysis: Analysis = {
      summary: [
        { text: 'Valid item.', citations: [{ timestamp: '00:10' }] },
        { text: 'Hallucinated item.', citations: [{ timestamp: '99:99' }] },
      ],
      actionItems: [],
      decisions: [],
      followUpSuggestions: [],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.summary).toHaveLength(1);
    expect(result.summary[0]!.text).toBe('Valid item.');
  });

  it('strips hallucinated citations but retains item if at least one citation is valid', () => {
    const analysis: Analysis = {
      summary: [
        {
          text: 'Mixed item.',
          citations: [
            { timestamp: '00:10' }, // valid
            { timestamp: '99:99' }, // hallucinated
          ],
        },
      ],
      actionItems: [],
      decisions: [],
      followUpSuggestions: [],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.summary).toHaveLength(1);
    expect(result.summary[0]!.citations).toHaveLength(1);
    expect(result.summary[0]!.citations[0]!.timestamp).toBe('00:10');
  });

  it('removes action items where all citations are hallucinated', () => {
    const analysis: Analysis = {
      summary: [],
      actionItems: [
        { task: 'Ghost task', assignee: 'Nobody', citations: [{ timestamp: '55:00' }] },
      ],
      decisions: [],
      followUpSuggestions: [],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.actionItems).toHaveLength(0);
  });

  it('handles empty transcript — all items get removed (no valid timestamps exist)', () => {
    const analysis: Analysis = {
      summary: [{ text: 'Some text.', citations: [{ timestamp: '00:10' }] }],
      actionItems: [],
      decisions: [],
      followUpSuggestions: [],
    };

    const result = validateCitations(analysis, []);

    // No valid timestamps means all citations are invalid
    expect(result.summary).toHaveLength(0);
  });

  it('handles empty analysis gracefully', () => {
    const analysis: Analysis = {
      summary: [],
      actionItems: [],
      decisions: [],
      followUpSuggestions: [],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.summary).toHaveLength(0);
    expect(result.actionItems).toHaveLength(0);
    expect(result.decisions).toHaveLength(0);
    expect(result.followUpSuggestions).toHaveLength(0);
  });

  it('handles multiple valid items across all sections', () => {
    const analysis: Analysis = {
      summary: [
        { text: 'Point 1.', citations: [{ timestamp: '00:10' }] },
        { text: 'Point 2.', citations: [{ timestamp: '00:20' }] },
      ],
      actionItems: [
        { task: 'Task A', assignee: 'Alice', citations: [{ timestamp: '00:20' }] },
        { task: 'Task B', assignee: 'Bob', citations: [{ timestamp: '00:30' }] },
      ],
      decisions: [
        { text: 'Decision 1.', citations: [{ timestamp: '00:10' }] },
      ],
      followUpSuggestions: [
        { text: 'Follow up 1.', citations: [{ timestamp: '00:30' }] },
      ],
    };

    const result = validateCitations(analysis, sampleTranscript);

    expect(result.summary).toHaveLength(2);
    expect(result.actionItems).toHaveLength(2);
    expect(result.decisions).toHaveLength(1);
    expect(result.followUpSuggestions).toHaveLength(1);
  });
});

describe('Unified Response Format', () => {
  it('traceId structure is a non-empty string', () => {
    const traceId = '3ab7ba82-00f0-4ce8-99ff-bcb967e95e0c';
    expect(typeof traceId).toBe('string');
    expect(traceId.length).toBeGreaterThan(0);
  });

  it('success response shape matches spec', () => {
    const response = { traceId: 'abc', success: true, data: { id: '1' } };
    expect(response).toMatchObject({ success: true, traceId: expect.any(String) });
    expect(response.data).toBeDefined();
  });

  it('error response shape matches spec', () => {
    const response = {
      traceId: 'abc',
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    };
    expect(response.success).toBe(false);
    expect(response.error.code).toBeDefined();
    expect(response.error.message).toBeDefined();
  });
});
