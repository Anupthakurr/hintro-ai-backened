# Meeting Intelligence Service

> AI-powered meeting intelligence service for the Hintro Backend Engineering Internship Assignment.

## Features

- 🔐 **JWT Authentication** — Register/login with secure bcrypt password hashing
- 📋 **Meeting Management** — Create, list (paginated), and retrieve meetings with transcripts
- 🤖 **AI Analysis** — Gemini 2.0 Flash powered insights with grounded citations
- ✅ **Action Item Management** — Create, update status, filter, and detect overdue items
- ⏰ **Scheduled Reminders** — Hourly cron job that sends overdue email reminders via Resend
- 📧 **External Integration** — Resend email API for real reminder delivery
- 📖 **Swagger/OpenAPI** — Full API documentation at `/api/docs`
- 🔍 **Structured Logging** — Winston with trace IDs on every request

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| AI Provider | Google Gemini 2.0 Flash |
| Email | Resend |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| Logging | Winston |
| Scheduler | node-cron |
| Docs | swagger-jsdoc + swagger-ui-express |
| Tests | Jest + Supertest |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or use Docker Compose)
- npm 9+

---

## Quick Start (Local)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/meeting-intelligence-service
cd meeting-intelligence-service
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hintro_db"
JWT_SECRET="your-secret-key-min-32-chars"
GEMINI_API_KEY="your-gemini-key"          # https://aistudio.google.com/app/apikey
RESEND_API_KEY="your-resend-key"          # https://resend.com
FROM_EMAIL="onboarding@resend.dev"
CANDIDATE_NAME="Your Name"
CANDIDATE_EMAIL="your@email.com"
REPOSITORY_URL="https://github.com/..."
DEPLOYED_URL="https://your-deployment.com"
```

### 3. Set up database

```bash
# Start PostgreSQL (or use your own instance)
npm run db:migrate      # Run migrations
npm run db:generate     # Generate Prisma client
```

### 4. Run

```bash
npm run dev             # Development with hot reload
# or
npm run build && npm start   # Production
```

Server starts at `http://localhost:3000`
API Docs available at `http://localhost:3000/api/docs`

---

## Quick Start (Docker)

```bash
cp .env.example .env
# Fill in your API keys in .env

docker-compose up --build
```

This starts PostgreSQL + the app, runs migrations automatically.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars recommended) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `FROM_EMAIL` | ✅ | Sender email address |
| `PORT` | ❌ | Server port (default: 3000) |
| `NODE_ENV` | ❌ | `development` or `production` |
| `CORS_ORIGIN` | ❌ | CORS origin (default: `*`) |
| `CANDIDATE_NAME` | ❌ | Your name (for /api/evaluation) |
| `CANDIDATE_EMAIL` | ❌ | Your email (for /api/evaluation) |
| `REPOSITORY_URL` | ❌ | GitHub repo URL |
| `DEPLOYED_URL` | ❌ | Production URL |

---

## API Usage Examples

### Authentication

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"securepass123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"securepass123"}'
# Save the token from response
TOKEN="<token from response>"
```

### Meetings

**Create Meeting:**
```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sprint Planning",
    "participants": ["alice@example.com", "bob@example.com"],
    "meetingDate": "2026-05-20T10:00:00Z",
    "transcript": [
      {"timestamp": "00:10", "speaker": "John", "text": "We should launch next Friday."},
      {"timestamp": "00:20", "speaker": "Alice", "text": "I will prepare release notes."}
    ]
  }'
# Save meeting ID
MEETING_ID="<id from response>"
```

**Analyze Meeting (AI):**
```bash
curl -X POST http://localhost:3000/api/meetings/$MEETING_ID/analyze \
  -H "Authorization: Bearer $TOKEN"
```

**List Meetings:**
```bash
curl "http://localhost:3000/api/meetings?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Action Items

**Create Action Item:**
```bash
curl -X POST http://localhost:3000/api/action-items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Prepare release notes",
    "assignee": "Alice",
    "assigneeEmail": "alice@example.com",
    "dueDate": "2026-05-25T00:00:00Z",
    "meetingId": "'$MEETING_ID'",
    "citations": [{"timestamp": "00:20", "speaker": "Alice"}]
  }'
```

**Update Status:**
```bash
curl -X PATCH http://localhost:3000/api/action-items/$ITEM_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

**Get Overdue Items:**
```bash
curl http://localhost:3000/api/action-items/overdue \
  -H "Authorization: Bearer $TOKEN"
```

---

## Running Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

---

## Deployment

### Railway

1. Create a new Railway project
2. Add a PostgreSQL plugin
3. Set all environment variables from `.env.example`
4. Connect your GitHub repository
5. Railway auto-builds and deploys

### Render

1. Create a new Web Service, point to repo
2. Build command: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
3. Start command: `npm start`
4. Add a PostgreSQL database service
5. Set environment variables

---

## API Documentation

Swagger UI: `http://localhost:3000/api/docs`
OpenAPI JSON: `http://localhost:3000/api/docs.json`
