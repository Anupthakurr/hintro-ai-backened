# Testing Documentation

## Test Strategy

The test suite covers two primary areas:

1. **Integration tests** (`__tests__/auth.test.ts`) — test HTTP routes end-to-end through the Express app with Prisma mocked
2. **Unit tests** (`__tests__/citations.test.ts`) — test the citation validation logic in isolation

---

## Running Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

---

## Test Scenarios

### Authentication

| Scenario | Expected | Status |
|---|---|---|
| Register with valid data | 201 + user + JWT token | ✅ |
| Register with invalid email | 400 VALIDATION_ERROR | ✅ |
| Register with short password (<8 chars) | 400 VALIDATION_ERROR | ✅ |
| Register with missing name | 400 VALIDATION_ERROR | ✅ |
| Register with duplicate email | 409 EMAIL_TAKEN | ✅ |
| Login with missing password | 400 VALIDATION_ERROR | ✅ |
| Login with invalid email format | 400 VALIDATION_ERROR | ✅ |

### System Endpoints

| Scenario | Expected | Status |
|---|---|---|
| GET /health | 200 { status: "UP" } | ✅ |
| GET /api/evaluation | 200 with candidate data | ✅ |
| GET /api/nonexistent | 404 NOT_FOUND | ✅ |

### Response Format

| Scenario | Expected | Status |
|---|---|---|
| Every response has traceId | Yes | ✅ |
| Success response has `success: true` | Yes | ✅ |
| Error response has `success: false` | Yes | ✅ |
| Error response has `error.code` and `error.message` | Yes | ✅ |
| X-Trace-Id response header present | Yes | ✅ |

### Citation Validation (Unit Tests)

| Scenario | Expected | Status |
|---|---|---|
| Valid citations all kept | All citations retained | ✅ |
| Hallucinated timestamp removed | Item with only bad timestamps dropped | ✅ |
| Mixed citations (some valid, some not) | Valid citations kept, item retained | ✅ |
| Item with all hallucinated citations | Entire item dropped | ✅ |
| Empty transcript, empty analysis | Empty arrays returned | ✅ |

---

## Edge Cases Considered

### Input Validation
- Empty strings for required fields
- Invalid email formats (missing @, multiple @, no TLD)
- Password too short or too long
- Invalid ISO 8601 dates (`meetingDate`, `dueDate`)
- Invalid UUID for `meetingId`
- Invalid status value (not one of PENDING/IN_PROGRESS/COMPLETED)
- Malformed JSON body (handled by Express JSON parser + error handler)
- Missing required fields
- Arrays with zero items (e.g., empty participants, empty transcript)

### AI Analysis
- Transcript with a single entry
- AI returns empty arrays (all sections empty — valid)
- AI returns timestamps not in transcript (filtered out)
- AI service unavailable (502 AI_SERVICE_ERROR)
- JSON parse failure (502 AI_PARSE_ERROR)

### Overdue Detection
- Action item with no dueDate — NOT considered overdue
- Action item with COMPLETED status and past dueDate — NOT overdue
- Action item with PENDING status and past dueDate — IS overdue
- Action item with IN_PROGRESS status and past dueDate — IS overdue

### Reminders
- Action item with no `assigneeEmail` — skipped with warning log
- Resend API error — failure recorded in Reminder table, job continues
- Multiple overdue items — all processed in sequence

### Pagination
- `page=0` returns 400 (must be positive)
- `limit=0` returns 400 (must be min 1)
- `limit=101` returns 400 (max is 100)
- `page` beyond available data — returns empty items array with correct total

---

## Limitations Discovered

1. **No E2E AI tests**: The AI analysis endpoint tests require a real Gemini API key and make actual API calls, so they are excluded from the automated test suite. Manual testing was performed.

2. **No Resend integration tests**: Email delivery tests require a real Resend key. The email client is unit-testable in isolation but not included in the automated suite to avoid sending real emails during tests.

3. **No database transaction tests**: Prisma transaction behavior (e.g., analyze + create action items atomically) was verified manually but not unit-tested.

4. **Test isolation**: Tests mock Prisma and the config. A future improvement would be to use a test database (e.g., PostgreSQL Docker container) for true integration tests.

5. **Race condition in scheduler**: If the server restarts during a reminder job run, some reminders may be sent twice. A future improvement would be idempotency keys or a "sending" status.

---

## Manual Test Scenarios Executed

1. **Full flow**: Register → Login → Create Meeting → Analyze → Check action items auto-created → Update status → Verify overdue detection
2. **Pagination**: Created 25 meetings, listed with `limit=10`, verified `totalPages=3`
3. **Filtering**: Created items with different statuses, filtered by `status=PENDING` and `status=COMPLETED`
4. **Reminder scheduler**: Set a past `dueDate`, waited for scheduler to run, verified Reminder record created
5. **Auth protection**: Attempted to access protected endpoints without token, verified 401 response
6. **Invalid input**: Sent malformed JSON, missing fields, invalid emails — all returned structured errors without crashing
