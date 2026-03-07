# AI IDE - Personal Life Organizer

A full-stack AI-powered personal operating system built with Next.js, Supabase, and Anthropic Claude.

## Architecture

```
Browser (React + Redux Toolkit)
    ↓ fetch / Redux thunks
Next.js API Routes (/api/*)
    ↓ Supabase client (server-side)     ↓ Anthropic SDK
Supabase (Postgres + Auth)          Claude claude-opus-4-6
```

**Key directories:**
- `src/app/(dashboard)/` — Page components (tasks, habits, calendar, knowledge, live-assistant)
- `src/app/api/` — 95 Next.js App Router API routes
- `src/state/slices/` — 23 Redux Toolkit slices
- `src/lib/assistant/` — AI intent routing, vault commands, learning pipeline
- `src/lib/ai/` — Anthropic client with circuit breaker + retry logic
- `src/lib/api/middleware.ts` — `withAuth` + `withApiHandler` HOFs
- `src/components/` — Reusable UI components (Radix UI + shadcn/ui)

## Feature Areas

| Area | Routes | Description |
|------|--------|-------------|
| **Live Assistant** | `/api/live-assistant` | Claude-powered chat with intent routing, vault commands, growth phases |
| **Tasks** | `/api/tasks` | Task CRUD, auto-scheduling, batch operations |
| **Habits** | `/api/habits` | Habit tracking, completions, AI-generated Atomic Habits plans |
| **Calendar** | `/api/calendar` | Event CRUD, Google Calendar sync, conflict detection |
| **Knowledge / Second Brain** | `/api/knowledge/*` | Zettelkasten notes, RAG chat, idea expansion, graph visualization |
| **Automations** | `/api/automations`, `/api/cron/*` | Time-based automation rules run via Vercel Cron |
| **Gamification** | `/api/gamification` | XP, levels, streaks |
| **Voice** | `/api/voice/*` | OpenAI Whisper STT + TTS |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (used by cron jobs) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key (Claude) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key (Whisper STT + TTS + embeddings) |
| `CRON_SECRET` | ✅ **Security-critical** | Secret token for Vercel Cron auth — must be set or all cron requests are rejected |
| `GOOGLE_CLIENT_ID` | optional | Google Calendar OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | optional | Google Calendar OAuth client secret |
| `STRIPE_SECRET_KEY` | optional | Stripe subscription billing |
| `STRIPE_WEBHOOK_SECRET` | optional | Stripe webhook signature verification |
| `SENTRY_DSN` | optional | Sentry error tracking |
| `LOG_LEVEL` | optional | Pino log level (`debug`/`info`/`warn`/`error`) |

> **⚠️ CRON_SECRET is required for production.** If not set, the `/api/cron/automations` endpoint
> rejects ALL requests (fail-closed). Vercel automatically sends this as `Authorization: Bearer <secret>`.

## Local Development

```bash
npm install
npm run dev        # Next.js dev server on http://localhost:3000
npm run test       # Vitest unit tests
npm run test:run   # Single test run (CI mode)
```

## Database

Run migrations in order from `supabase/migrations/`. Key tables:
- `users`, `user_preferences`, `user_memories`
- `tasks`, `habits`, `habit_completions`, `calendar_events`
- `assistant_messages`, `conversations`, `ai_decisions`
- `knowledge_notes`, `knowledge_links`, `cognitive_events` (requires `vector` extension)
- `automation_rules`, `feature_flags`, `user_activity_signals`

## Security Notes

- All API routes check Supabase session before processing
- `src/lib/api/middleware.ts` provides `withAuth` + `withApiHandler` HOFs for new routes
- Vault command args are sanitized before insertion into Claude prompts
- Cron endpoints are fail-closed: `CRON_SECRET` must be set or all requests return 401
- DB errors are logged server-side via pino; clients receive generic error messages

## Deployment

Deployed to Vercel. Vercel Cron is configured in `vercel.json` to call `/api/cron/automations` every 30 minutes. Set `CRON_SECRET` in Vercel environment variables and add it to the cron job configuration.
