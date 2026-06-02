# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.0] — 2026-06-02

### Initial Release

#### Infrastructure
- Initialized Node.js + TypeScript project with Express.js
- Configured Prisma ORM with PostgreSQL schema
- Implemented Winston structured logging with trace IDs
- Implemented traceId middleware (UUID v4 generation + X-Trace-Id header)
- Implemented request/response logging middleware
- Implemented centralized global error handler (AppError, ZodError, Prisma errors)
- Implemented unified API response format (`{ traceId, success, data/error }`)
- Configured Swagger/OpenAPI documentation with swagger-jsdoc

#### Authentication
- Implemented user registration with bcrypt password hashing (12 rounds)
- Implemented JWT login with configurable expiry
- Implemented JWT auth middleware for protected routes
- Added Zod validation for auth endpoints (email format, password length)

#### Meetings
- Implemented Create Meeting endpoint with transcript ingestion
- Implemented Get Meeting by ID (scoped to authenticated user)
- Implemented List Meetings with pagination and title filtering
- Implemented AI Analysis endpoint using Google Gemini 2.0 Flash

#### AI Integration
- Designed grounding-focused prompt with explicit timestamp whitelist
- Set temperature=0.1 for factual, low-hallucination outputs
- Implemented post-generation citation validator (strips hallucinated timestamps)
- AI-extracted action items are auto-created in the database after analysis

#### Action Items
- Implemented Create Action Item endpoint with citation requirement
- Implemented Update Status endpoint (PENDING → IN_PROGRESS → COMPLETED)
- Implemented List Action Items with status/assignee/meetingId filtering
- Implemented Get Overdue Action Items endpoint
- Route ordering fix: `/overdue` registered before `/:id` to prevent shadowing

#### External Integration
- Integrated Resend email API for reminder delivery
- Implemented rich HTML email template for overdue reminders
- Implemented hourly cron scheduler (node-cron) for automated reminders
- Reminder history recorded in `Reminder` table with success/error tracking

#### Documentation
- README.md with setup, env vars, and API usage examples
- DECISIONS.md with rationale for all major technical choices
- AI_APPROACH.md covering prompt design and hallucination prevention
- TESTING.md with test scenarios and edge cases
- CHECKLIST.md submission checklist

#### DevOps
- Multi-stage Dockerfile (builder + production)
- Docker Compose for local development (PostgreSQL + app)
- .env.example with all required variables documented
- .gitignore configured
