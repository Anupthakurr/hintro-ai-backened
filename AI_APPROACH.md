# AI Approach

This document explains the AI integration design, prompt engineering, citation strategy, hallucination prevention, and known limitations.

---

## Model Choice

**Provider:** Google Gemini 2.0 Flash via `@google/generative-ai`

**Configuration:**
```typescript
{
  model: 'gemini-2.0-flash',
  generationConfig: {
    responseMimeType: 'application/json',  // Forces valid JSON output
    temperature: 0.1,                       // Low temperature for factual accuracy
  }
}
```

Setting `temperature: 0.1` makes the model highly deterministic and factual. Higher temperatures introduce creativity (undesirable for grounded analysis).

Setting `responseMimeType: 'application/json'` forces the model to output valid JSON directly, avoiding common issues with markdown code fences wrapping the JSON.

---

## Prompt Design

The prompt follows a strict instruction pattern:

### System Instructions
```
You are a precise meeting analyst. Your task is to extract insights from the meeting transcript below.

STRICT RULES — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. ONLY use information explicitly stated in the transcript.
2. For EVERY insight, include at least one citation with a timestamp that appears VERBATIM in the transcript.
3. Valid timestamps you may cite: ["00:10", "00:20", ...] (injected from actual transcript)
4. Do NOT invent attendees, tasks, decisions, or outcomes not mentioned.
5. If you cannot ground an insight, OMIT it entirely.
6. For assignee names, only use speakers mentioned in the transcript.
7. Return ONLY valid JSON.
```

### Key Design Decisions

1. **Whitelist of valid timestamps injected into the prompt**: The model sees `Valid timestamps: ["00:10", "00:20"]` — this makes it easy for the model to self-check citations while generating.

2. **"Omit, don't fabricate" instruction**: The model is explicitly told that partial or empty arrays are preferred over hallucinations.

3. **Assignee constraint**: Only speakers present in the transcript may be listed as assignees, preventing invented participants.

4. **Context-complete input**: The full meeting title, date, participant emails, and transcript are provided, so the model has all the context it needs without needing to infer.

---

## Citation Strategy

Every generated item (summary point, action item, decision, follow-up suggestion) must include at least one citation:

```json
{
  "timestamp": "00:10",      // Must match exactly
  "speaker": "John",          // Optional attribution
  "excerpt": "We should launch next Friday."  // Short verbatim quote
}
```

**Two-layer citation enforcement:**

### Layer 1: Prompt-level constraint
The prompt explicitly lists valid timestamps and instructs the model to only use those. This is preventative.

### Layer 2: Post-generation validation (code-level)
After receiving the AI response, `validateCitations()` runs:

```typescript
function validateCitations(analysis, transcript) {
  const validTimestamps = new Set(transcript.map(t => t.timestamp));

  // For each citation in every section:
  // - If timestamp not in validTimestamps → remove it
  // - If an item has zero remaining citations → remove the entire item
}
```

This is a hard safety net: even if the model ignores prompt instructions, hallucinated timestamps are stripped before the response is sent to the client or stored in the database.

---

## Hallucination Prevention Approach

| Risk | Prevention |
|---|---|
| Inventing timestamps | Whitelist in prompt + post-generation filter |
| Inventing participants | Prompt instruction + assignee constraint |
| Adding information not in transcript | "Omit don't fabricate" instruction |
| Inventing action items | Citation requirement (can't cite → can't include) |
| JSON parsing failures | Try/catch with `AI_PARSE_ERROR` response code |

The key insight is: **if the model cannot ground a claim in a transcript timestamp, it cannot include it**. The citation requirement acts as a forcing function for grounding.

---

## Output Validation Strategy

```
AI Response → JSON.parse() → validateCitations() → Store to DB → Return to client
```

1. **JSON parsing**: Wrapped in try/catch. If the model returns invalid JSON (rare with `responseMimeType: 'application/json'`), we return a 502 with `AI_PARSE_ERROR` code.

2. **Citation validation**: All 4 sections (summary, actionItems, decisions, followUpSuggestions) are filtered. Items with no valid citations are dropped.

3. **Logging**: Each filtered/dropped citation is logged as a warning with the invalid timestamp, providing an audit trail.

4. **Auto-created action items**: Action items extracted by AI are auto-created in the database within the same transaction as saving the analysis. This ensures consistency.

---

## Auto-Population of Action Items

When `/api/meetings/:id/analyze` is called:
1. AI extracts action items with citations
2. These are automatically inserted into the `ActionItem` table
3. A `dueDate` from the AI (if the meeting transcript mentions a date) is parsed
4. `assigneeEmail` is null by default (the AI can't know email addresses from names alone)

Users can then update `assigneeEmail` via `PATCH /api/action-items/:id/status` and the reminder scheduler will pick them up.

---

## Known Limitations

1. **Email-to-name matching**: If a participant email is `alice@example.com` and the transcript speaker is `Alice`, the system cannot automatically set `assigneeEmail` on AI-extracted action items. This requires a user to manually update `assigneeEmail` for reminders to fire.

2. **Ambiguous speakers**: If two people have the same first name in a meeting, the AI may attribute tasks incorrectly. This is a fundamental limitation of name-only identification in transcripts.

3. **Timestamps format**: The current implementation matches timestamps as exact strings (e.g., `"00:10"` vs `"0:10"` would not match). Timestamps should be consistent in the input transcript.

4. **Long transcripts**: Very long meetings (hundreds of entries) may approach Gemini's context window or increase latency. Future optimization: chunk transcripts for very long meetings.

5. **No dueDate extraction without explicit mention**: If a transcript says "by end of quarter" rather than a specific date, the AI may return `null` for `dueDate`. This is correct behavior (better to return null than hallucinate a date).

6. **Rate limits**: Free-tier Gemini has rate limits. High concurrency could trigger 429 errors (handled with `AI_SERVICE_ERROR` response code).
