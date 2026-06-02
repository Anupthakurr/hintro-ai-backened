# Technical Decisions

This document explains the key technical decisions made in building the Meeting Intelligence Service.

---

## 1. Runtime & Language: Node.js + TypeScript

**Chosen:** Node.js 20 with TypeScript 5

**Why:**
- TypeScript catches an entire class of runtime errors at compile time (null access, wrong types, missing fields)
- Node.js has excellent async I/O performance for API servers
- Rich ecosystem: Prisma, Zod, Winston, express — all have first-class TypeScript support
- Strong familiarity and team-wide adoption in the backend ecosystem

**Alternatives considered:**
- Python + FastAPI — excellent for AI-heavy work but the ecosystem for this specific combination (Prisma-equivalent, Zod-equivalent) is less ergonomic
- Go — better raw performance but slower to iterate on for an assignment scope

**Trade-offs:**
- Compiled step adds build time (mitigated by ts-node-dev in dev)
- TypeScript strictness requires some boilerplate

---

## 2. Web Framework: Express.js

**Chosen:** Express.js 5

**Why:**
- Minimal, un-opinionated: allows clean layered architecture (routes → controllers → services)
- Ubiquitous in the Node.js ecosystem
- Middleware model maps cleanly to cross-cutting concerns (tracing, logging, auth, errors)

**Alternatives considered:**
- Fastify — faster, but less familiar; good choice for high-performance production systems
- NestJS — adds structure via decorators but introduces significant framework overhead for this scope

---

## 3. Database: PostgreSQL + Prisma ORM

**Chosen:** PostgreSQL 16 with Prisma

**Why:**
- Relational data model is the right fit: meetings have participants, transcripts; action items have FK to meetings; reminders have FK to action items
- Prisma gives type-safe queries that match TypeScript interfaces automatically
- Prisma migrations are version-controlled and reproducible
- `participants String[]` (array column) avoids a separate Participant table for this scope
- `transcript Json` and `citations Json` store semi-structured data flexibly without over-normalizing

**Alternatives considered:**
- MongoDB — flexible schema, but loses FK integrity guarantees and relational query power
- SQLite — simpler setup but not production-grade (no concurrent writes, no hosted cloud option)
- MySQL — similar power to Postgres, but Postgres has better JSON support and array types

**Trade-offs:**
- `participants` as `String[]` means no individual participant tracking/querying beyond the array
- `transcript` and `analysis` as `Json` means no column-level querying inside the transcript (acceptable since AI processing consumes the whole transcript)

---

## 4. Authentication: JWT (JSON Web Tokens)

**Chosen:** Stateless JWT with `jsonwebtoken`, passwords hashed with `bcryptjs` (12 rounds)

**Why:**
- Stateless: no session store needed, scales horizontally without sticky sessions
- Simple to implement and reason about for this assignment scope
- `Authorization: Bearer <token>` is a well-understood standard
- 12 bcrypt rounds provides strong security with ~300ms hash time (good OWASP default)

**Alternatives considered:**
- Session-based auth (express-session + Redis) — more secure revocation, but requires Redis infrastructure
- Passport.js — useful for multi-strategy auth, but adds indirection for a single-strategy setup

**Trade-offs:**
- No built-in token revocation (logout doesn't invalidate existing tokens until expiry)
- Token expiry (7d default) is a balance between UX and security

---

## 5. AI Provider: Google Gemini 2.0 Flash

**Chosen:** Gemini 2.0 Flash via `@google/generative-ai`

**Why:**
- **Free tier** is generous enough for development and evaluation
- `responseMimeType: 'application/json'` enforces valid JSON output natively (no markdown wrapping issues)
- Very fast inference time (Flash model)
- Excellent instruction-following for structured output tasks

**Alternatives considered:**
- OpenAI GPT-4o — excellent quality but paid API required
- Groq (Llama/Mixtral) — ultra-fast, free tier, good quality; strong runner-up
- Claude — excellent reasoning, no free tier for API
- OpenRouter — good aggregator but adds a routing layer

**Trade-offs:**
- Gemini's Flash model is optimized for speed over maximum reasoning depth (fine for meeting analysis)

---

## 6. External Integration: Resend (Email API)

**Chosen:** Resend

**Why:**
- Clean, minimal REST API: one SDK call to send rich HTML emails
- **Free tier**: 100 emails/day, 3000/month — sufficient for evaluation
- `onboarding@resend.dev` sender works without domain verification for testing
- Deliverability-focused (built by ex-Twilio team)
- The reminder workflow is genuinely meaningful: overdue items trigger real email delivery

**Alternatives considered:**
- SendGrid — more enterprise, higher complexity for basic usage
- Slack Webhook — easier to set up, but email is a more realistic production reminder channel
- Telegram Bot — fun, but requires users to have Telegram
- Notion API — not a notification channel

**Trade-offs:**
- Real email delivery to arbitrary addresses requires a verified domain; `onboarding@resend.dev` works for demo only

---

## 7. Validation: Zod

**Chosen:** Zod

**Why:**
- TypeScript-first: schemas automatically infer TypeScript types (no duplication)
- Excellent error messages, directly usable in API responses
- `z.coerce` for query params is clean
- Global error handler catches ZodError and formats it into the unified response envelope

**Alternatives considered:**
- Joi — older, less TypeScript-native
- class-validator — requires decorators, heavier
- Manual validation — not scalable

---

## 8. Scheduler: node-cron

**Chosen:** node-cron (runs every hour: `0 * * * *`)

**Why:**
- Simple, well-maintained, no external infrastructure
- In-process scheduling is appropriate for a single-server deployment
- Logs every run with traceId for full observability

**Alternatives considered:**
- Bull/BullMQ (Redis-backed queue) — better for distributed systems; overkill for single-server
- Agenda (MongoDB-backed) — similar tradeoff
- External cron (Render Cron Job, Railway Cron) — valid for production but adds deployment complexity

**Trade-offs:**
- In-process cron stops when server restarts — acceptable for demo; production would use a persistent queue

---

## 9. Project Structure

```
src/
├── config/     # env.ts (validated config), logger.ts
├── lib/        # External clients: prisma.ts, ai/geminiClient.ts, email/resendClient.ts
├── middleware/ # traceId, requestLogger, auth, errorHandler
├── modules/    # Feature modules: auth/, meetings/, actionItems/, reminders/
│   └── [module]/
│       ├── *.schema.ts     # Zod validation
│       ├── *.service.ts    # Business logic
│       ├── *.controller.ts # HTTP layer
│       └── *.routes.ts     # Express routes + OpenAPI annotations
├── utils/      # response.ts (unified format helpers)
├── app.ts      # Express app setup
└── index.ts    # Server bootstrap
```

**Why this structure:**
- Module-based colocation: all concerns for a feature live together
- Thin controllers: all business logic in services, controllers only validate + delegate
- Separating `lib/` from `modules/` makes external integrations easy to swap
