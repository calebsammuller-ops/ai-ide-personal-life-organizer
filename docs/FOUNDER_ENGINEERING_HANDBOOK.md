# AI IDE - Personal Life Organizer
# Founder + Engineering Handbook

**Version:** 1.0
**Last Updated:** 2026-02-12
**Status:** Internal — Single Source of Truth

---

## Table of Contents

1. [AI Memory System Design](#section-1--ai-memory-system-design)
2. [Claude Sub-Agent Architecture](#section-2--claude-sub-agent-architecture)
3. [Privacy Policy](#section-3--privacy-policy-users-actually-trust)
4. [Pro-Tier Feature Gating Strategy](#section-4--pro-tier-feature-gating-strategy)
5. [App Store Approval Risk Map](#section-5--app-store-approval-risk-map)
6. [Engineering Guidelines](#section-6--engineering-guidelines)
7. [Founder Principles](#section-7--founder-principles)

---

## SECTION 1 — AI MEMORY SYSTEM DESIGN

### Philosophy

Memory is what separates an assistant from a chatbot. Our memory system must feel like continuity — the user should never have to repeat themselves — while remaining fully transparent, reversible, and privacy-compliant.

### Memory Layers

#### Layer 1: Working Memory (Session-Level)

**What it holds:** Current conversation context, today's schedule snapshot, active tasks, pending habits, real-time user intent.

**Lifecycle:** Created at session start, destroyed at session end. Never persisted to database.

**Implementation:**
- Constructed fresh per API call in `fetchUserContext()` in the assistant route
- Includes: today's events, pending habits, today's meals, unprocessed thoughts count, habit stats
- Limited to 10 most recent conversation messages for context window efficiency
- No database writes — purely ephemeral

**Why:** Provides immediate context without storage overhead or privacy risk. The AI "knows" what's happening right now without retaining anything permanently from the session itself.

#### Layer 2: Short-Term Memory (Days)

**What it holds:** Recent behavioral signals — what the user did in the last 7-14 days. Habit completions, scheduling patterns, missed events, conversation topics.

**Lifecycle:** Rolling 14-day window. Auto-expires. Never manually curated.

**Implementation:**
```sql
-- Supabase table: user_activity_signals
create table user_activity_signals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  signal_type text not null, -- 'habit_completed', 'task_rescheduled', 'event_cancelled', etc.
  signal_data jsonb default '{}',
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '14 days')
);

-- RLS: users can only see their own signals
alter table user_activity_signals enable row level security;
create policy "Users see own signals" on user_activity_signals
  for all using (auth.uid() = user_id);

-- Auto-cleanup expired signals (Supabase cron or edge function)
-- Runs daily: DELETE FROM user_activity_signals WHERE expires_at < now();
```

**Why:** Allows the AI to say "I noticed you've been skipping your morning run this week" without permanently storing behavioral data. The 14-day window is enough to detect patterns without becoming surveillance.

#### Layer 3: Long-Term Memory (Months)

**What it holds:** Learned patterns — productivity peaks, habit success days, energy curves, scheduling preferences, response style preferences.

**Lifecycle:** Persistent but opt-in. User must enable "Learning Mode" in settings. Can be fully cleared at any time.

**Implementation:**
```sql
-- Stored in user_preferences.learned_patterns (JSONB column)
-- Schema for learned_patterns:
{
  "mostProductiveHours": ["9 AM", "10 AM", "2 PM"],
  "habitSuccessDays": ["Monday", "Wednesday", "Friday"],
  "peakEnergyTimes": ["morning", "early afternoon"],
  "habitFatigueSigns": ["skipping 3+ days", "reducing difficulty"],
  "responsePreferences": {
    "preferredResponseLength": "concise",
    "preferredTone": "direct"
  },
  "optimalScheduleSuggestions": ["Schedule deep work before 11 AM"],
  "insights": ["User prefers 30-min meetings over 60-min"],
  "lastUpdated": "2026-02-12T10:00:00Z"
}
```

**Why:** This is what makes the AI feel intelligent over time. But because it's derived (not raw data), it's less sensitive than storing raw behavioral logs. Users can inspect exactly what was learned.

#### Layer 4: Explicit User Memory (Manual)

**What it holds:** Facts the user explicitly told the AI to remember. "Remember that I'm vegetarian." "My daughter's birthday is March 15."

**Lifecycle:** Permanent until user deletes. Fully user-controlled.

**Implementation:**
```sql
-- Supabase table: user_memories (already exists in current schema)
create table user_memories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  category text default 'general', -- personal, preference, goal, health, work
  importance float default 0.5, -- 0.0 to 1.0, affects retrieval ranking
  source text default 'user', -- 'user' (explicit) or 'ai' (derived)
  created_at timestamptz default now(),
  last_accessed_at timestamptz default now()
);

-- RLS
alter table user_memories enable row level security;
create policy "Users manage own memories" on user_memories
  for all using (auth.uid() = user_id);
```

**Retrieval:** Top 15 most relevant memories are injected into the system prompt per conversation, ranked by importance and recency. Implemented in `memoryExtractor.ts`.

**Why:** This is the most trusted memory layer — the user said it, so the AI should remember it. No inference, no ambiguity.

#### Layer 5: Derived Memory (AI-Inferred)

**What it holds:** Patterns the AI inferred but the user didn't explicitly state. "User seems to prefer morning workouts." "User gets stressed on Mondays."

**Lifecycle:** Reversible. Flagged as `source: 'ai'` in the memories table. Can be disputed or deleted by the user.

**Implementation:**
- Generated by the learning pipeline (`learningPipeline.ts`) after every 5 conversation messages
- Stored in `user_memories` with `source: 'ai'`
- Displayed in Settings > Memories with a distinct "AI-inferred" badge
- User can delete any derived memory instantly

**Rules:**
- Never present AI-inferred memory as fact in conversation. Always qualify: "I've noticed that..." or "It seems like..."
- If a derived memory is wrong and the user corrects it, delete the memory and store the correction as explicit memory
- Maximum 50 derived memories per user to prevent memory bloat

### Memory System Rules

1. **No hallucinated memory.** If the AI doesn't have a memory, it must not fabricate one. Say "I don't have that information" rather than guessing.
2. **User-visible explanations.** Every memory is viewable in Settings > Memories. Each entry shows: content, category, source (user vs AI), and creation date.
3. **Opt-in long-term learning.** Learning Mode is OFF by default. Users enable it in Settings > Preferences. Without it, only Working Memory and Explicit Memory are active.
4. **Memory expiration.** Short-term signals: 14 days. Derived memories: reviewed every 90 days (if not accessed, prompt user to keep or delete). Explicit memories: permanent until deleted.
5. **Full deletion.** "Delete all my data" removes everything — memories, patterns, activity signals, conversation history. Irreversible. Implemented via Supabase cascading deletes.

---

## SECTION 2 — CLAUDE SUB-AGENT ARCHITECTURE

### Philosophy

One AI model, multiple responsibilities. Rather than a monolithic prompt that tries to do everything, we decompose the assistant into specialized agents with clear boundaries. Each agent has a single job, a defined input/output contract, and explicit fail-safe behavior.

### Agent Topology

```
User Message
     |
     v
[Router / Intent Classifier]
     |
     +---> Planner Agent (scheduling, time-blocking)
     +---> Analyzer Agent (patterns, insights, classification)
     +---> Notifier Agent (reminders, nudges, proactive alerts)
     +---> Executor Agent (action execution, CRUD operations)
     |
     v
[Response Composer] --> User
```

### Agent Definitions

#### 1. Planner Agent

**Responsibility:** Schedule creation, time-blocking, conflict resolution, energy-aware planning.

**Inputs:**
- User's calendar events (today + 7 days)
- Task list with priorities, deadlines, estimated durations
- Focus blocks configuration
- User preferences (wake time, work hours, sleep time)
- Energy patterns (from Long-Term Memory)

**Outputs:**
- Proposed schedule changes (never auto-applied without confirmation)
- Conflict alerts with resolution options
- Time-block suggestions

**Decision Rules:**
- High-priority tasks are scheduled during peak energy hours
- Buffer time (15 min) is added between back-to-back events
- Focus blocks are never scheduled over
- If a deadline is at risk, alert the user at least 48 hours in advance
- Never schedule past the user's sleep time

**Fail-safe:** If the Planner cannot create a feasible schedule, it explains why and offers tradeoff options ("You have 8 hours of tasks for 5 available hours. Which should be deferred?").

#### 2. Analyzer Agent

**Responsibility:** Pattern detection, productivity insights, habit fatigue detection, email/calendar classification reasoning.

**Inputs:**
- Short-term activity signals (14-day window)
- Habit completion history (30-day window)
- Calendar event patterns
- Conversation history themes

**Outputs:**
- Behavioral insights (stored in Long-Term Memory)
- Habit fatigue warnings
- Productivity trend reports
- Email classification reasoning (action required / informational / spam)

**Decision Rules:**
- Only surface insights with >= 70% confidence (minimum 7 data points)
- Habit fatigue is detected when: 3+ consecutive skips, or completion rate drops below 40% over 7 days
- Insights are generated asynchronously (not blocking the user's request)
- Email classification must explain its reasoning (e.g., "Marked as action-required because it contains a deadline: March 15")

**Fail-safe:** If data is insufficient for an insight, do not generate one. Never extrapolate from < 5 data points.

#### 3. Notifier Agent

**Responsibility:** Smart reminders, notification throttling, context-aware nudges, silence detection.

**Inputs:**
- Upcoming events and deadlines
- Pending habits for today
- User's notification preferences
- Recent notification history (to prevent spam)
- User's current activity state (is the user in a focus block?)

**Outputs:**
- Notification payloads (push notification content + timing)
- Nudge messages (in-app gentle reminders)
- Silence decisions (when NOT to notify)

**Decision Rules:**
- Maximum 5 notifications per day (user-configurable)
- No notifications during sleep hours or active focus blocks
- If a notification was dismissed 3 times for the same type, reduce frequency for that type
- Deadline reminders: 48h, 24h, 2h before (configurable)
- Habit nudges: only if not completed by the user's historically typical completion time
- If user hasn't opened the app in 3+ days, send ONE re-engagement nudge (not more)

**Silence Rules:**
- During focus blocks: silence everything except critical deadline alerts
- After 9 PM (or user's configured wind-down time): only emergency-level notifications
- If user is actively in a conversation with the assistant: no push notifications (they're already engaged)

**Fail-safe:** If the notification system fails, notifications are silently dropped (not queued and sent in a burst later).

#### 4. Executor Agent

**Responsibility:** Action execution — creating events, completing habits, saving memories, generating files.

**Inputs:**
- Intent + action payload from the Router
- User ID for RLS-scoped database access

**Outputs:**
- Action result (success/failure + message)
- Side effects (e.g., XP awarded for completing a habit)

**Implementation:** Already exists as `intentHandler.ts` with `executeIntent()`. Supports 14 action types.

**Decision Rules:**
- All write operations require the intent to be explicitly parsed from the user's message (no guessing)
- Destructive actions (delete, cancel) require confirmation
- Batch operations are logged for auditability

**Fail-safe:** If an action fails, return a user-friendly error message and suggest an alternative approach. Never retry silently.

### Agent Communication Protocol

```
1. User sends message
2. Router classifies intent:
   - If actionable (schedule, create, complete) → Executor Agent
   - If analytical (why, how, pattern) → Analyzer Agent
   - If planning (optimize, reschedule, plan my day) → Planner Agent
   - If general conversation → Direct Claude response
3. Agent processes and returns structured output
4. Response Composer merges agent output with conversational tone
5. If action was executed, append result to response
6. If proactive insight is available, append as suggestion
```

### Decision Arbitration

When agents conflict (e.g., Planner wants to schedule during a time Notifier considers "silence hours"):
1. User's explicit preferences always win
2. Safety constraints (sleep, health) override productivity optimization
3. When truly ambiguous, ask the user

### Explainability Guarantees

Every agent decision must be traceable:
- **Planner:** "Scheduled your deep work at 9 AM because that's your peak energy time and you have no conflicts."
- **Analyzer:** "I noticed your meditation streak dropped this week. Based on 12 data points over 2 weeks, your completion rate dropped from 85% to 40%."
- **Notifier:** "I'm reminding you about your project deadline because it's 48 hours away and no progress has been logged."
- **Executor:** "Created 'Team Meeting' on Thursday at 2 PM. Shall I add a 15-minute prep block before it?"

---

## SECTION 3 — PRIVACY POLICY USERS ACTUALLY TRUST

### Privacy Policy — Plain Language Version

**Last updated: February 2026**

---

**The short version:** We work for you. Your data is yours. We use it only to make your experience better, and we'll always be transparent about how.

---

#### What We Collect and Why

| Data | Why We Collect It | How Long We Keep It |
|------|-------------------|---------------------|
| Email address | Account creation, password resets | Until you delete your account |
| Calendar events | To show your schedule and help plan your day | Until you delete them |
| Tasks & habits | To help you track progress and build routines | Until you delete them |
| Meal plans | To help you plan nutrition | Until you delete them |
| Thoughts/notes | To help you organize ideas | Until you delete them |
| Conversation history | So your AI assistant remembers context | Retained per conversation; deletable anytime |
| Learned preferences | So the AI gets smarter about your patterns | Only if you enable Learning Mode; deletable anytime |
| Memories you share | So the AI remembers what you tell it | Until you delete them |
| Usage analytics | To improve the app (anonymized, aggregated) | 90 days, then deleted |

#### What We Do NOT Collect

- We do NOT read your emails without your explicit, revocable permission
- We do NOT sell your data to anyone. Ever. Not anonymized, not aggregated, not at all.
- We do NOT use your data to train AI models. Your conversations and data are yours, not training material.
- We do NOT track your location unless you explicitly enable location-based reminders
- We do NOT share data with third parties except: Supabase (database hosting), Anthropic (AI processing, but your data is not retained by them per their data policy), OpenAI (voice synthesis only, no data retention), and Stripe (payment processing)

#### How AI Uses Your Data

Your AI assistant uses your data to:
- Know your schedule when you ask "What's on my plate today?"
- Remember preferences like "I'm vegetarian" when suggesting meals
- Detect patterns like "You're most productive in the morning" (only if Learning Mode is on)
- Proactively remind you about upcoming deadlines

The AI does NOT:
- Make irreversible decisions without asking you first
- Store your conversations for purposes other than helping you
- Infer sensitive information (health conditions, political views, etc.)

#### How Learning Mode Works

Learning Mode is **off by default.** When you turn it on:
1. The AI observes your patterns over time (productivity hours, habit consistency, scheduling preferences)
2. It creates "derived insights" — things it learned about you
3. You can see every insight in Settings > Memories, clearly marked as "AI-inferred"
4. You can delete any insight instantly
5. You can turn off Learning Mode at any time, and all derived insights are deleted

#### How to Delete Your Data

- **Delete specific items:** Remove any event, task, habit, memory, or conversation from the app
- **Delete AI memories:** Go to Settings > Memories and delete any or all
- **Delete learned patterns:** Turn off Learning Mode in Settings > Preferences
- **Delete everything:** Go to Settings > Profile > Delete Account. This permanently removes all your data from our servers within 30 days. This is irreversible.

#### Your Rights

- **Access:** You can see all data we have about you in the app
- **Correct:** You can edit any data at any time
- **Delete:** You can delete any or all data at any time
- **Export:** You can export your data (coming soon)
- **Withdraw consent:** You can revoke any permission at any time

#### Security

- All data is encrypted in transit (TLS 1.3) and at rest (AES-256)
- Database access is protected by Row Level Security — your data is isolated from other users at the database level
- Authentication is handled by Supabase Auth with industry-standard practices
- We conduct regular security reviews

#### Contact

Questions about your privacy? Email: privacy@aiidelivorganizer.com

---

## SECTION 4 — PRO-TIER FEATURE GATING STRATEGY

### Philosophy

Free users must get genuine value — enough to build a habit. Pro users get depth, autonomy, and intelligence. The upgrade moment should feel like unlocking a superpower, not removing an annoyance.

### Free Tier — "Personal Planner"

**Goal:** Immediately useful. Habit-forming. Demonstrates AI value.

| Feature | Limits |
|---------|--------|
| Calendar management | Full access |
| Task management (List view) | Full access |
| Habit tracking | Up to 5 active habits |
| Meal planning | Basic (manual entry only) |
| Thought organization | Up to 20 unprocessed thoughts |
| AI Assistant | 30 messages/day |
| Daily plan generation | 1 per day |
| Gamification | Full access (XP, levels, achievements) |
| Focus blocks | Up to 2 active |

**Why these limits:** Calendar and tasks are unrestricted because they're the core value prop. Limiting AI messages creates natural upgrade desire without crippling the experience. Gamification is free because it drives retention.

### Pro Tier — "Life OS" ($9.99/month or $79.99/year)

**Goal:** Full AI autonomy. Advanced views. Deep personalization.

| Feature | Details |
|---------|---------|
| All Free features | Unlimited |
| AI Assistant | Unlimited messages |
| Task views | Kanban, Timeline, Table, Custom |
| Learning Mode | AI learns your patterns |
| Web search | AI can search the internet for answers |
| Voice mode | Full voice-to-voice with TTS |
| Projects | Unlimited (Free: 3) |
| Time tracking | Full reports & analytics |
| Documents | Rich editor, unlimited |
| Automations | Custom rules & templates |
| Math Solver | Unlimited problem solving |
| Advanced scheduling | Energy-aware, auto-reschedule |
| File generation | Gantt charts, CSV exports, PDF reports |
| Priority support | Faster response times |

### Upgrade Moments (Ethical Triggers)

These are natural points where the user discovers they want more:

1. **AI message limit reached:** "You've used 30 messages today. Upgrade to Pro for unlimited AI conversations." (Not blocking — they can still use all other features)
2. **Kanban view discovery:** Task page shows the view switcher. Clicking Kanban/Timeline/Table on Free shows a preview + upgrade prompt.
3. **Learning Mode prompt:** After 7 days of use, the AI suggests: "I could learn your patterns to give better suggestions. This is a Pro feature."
4. **Voice mode teaser:** The voice button is visible but shows a Pro badge.
5. **Automation attempt:** When creating a 4th automation rule, prompt upgrade.

### Anti-Patterns We Avoid

- No "trial that auto-charges." Users explicitly choose to subscribe.
- No feature degradation after trial ends. If they tried Pro and downgrade, their data stays — they just can't use Pro features.
- No notification spam about upgrading. Maximum 1 upgrade suggestion per session.
- No paywalling data access. Users can always see and export their data regardless of tier.
- No artificial limits on core functionality (calendar, basic tasks, habits).

### Architecture

Feature gating is handled by `subscriptionService.ts`:
```typescript
// Check if user can use a feature
const check = await canUseFeature(userId, 'ai_message')
if (!check.allowed) {
  return { error: check.reason, upgradeRequired: true }
}

// Increment usage counter
await incrementUsage(userId, 'ai_message')
```

Feature flags are stored in Supabase `user_subscriptions` table with plan-level feature maps. No client-side gating for security — all checks happen server-side in API routes.

---

## SECTION 5 — APP STORE APPROVAL RISK MAP

### Risk Assessment Table

| Risk Area | Severity | Description | Mitigation |
|-----------|----------|-------------|------------|
| Email access | HIGH | Reading user emails requires clear justification and purpose limitation | OAuth read-only scopes. Clear permission dialog explaining exactly what we access and why. One-tap revocation. Never store raw email bodies. |
| AI decision-making | HIGH | Apple requires transparency in AI-driven features | Every AI decision includes explanation. "Why did AI do this?" button on all AI-generated content. No autonomous actions without user confirmation. |
| Background processing | MEDIUM | iOS limits background execution aggressively | Use push notifications for time-sensitive reminders instead of background polling. Batch learning pipeline runs server-side (not on device). |
| Notification abuse | MEDIUM | Excessive notifications = rejection | Hard cap of 5/day default. User-configurable. Intelligent throttling. Silence hours respected. |
| Voice recording | HIGH | Microphone access requires clear purpose | Permission dialog: "Microphone is used for voice commands to your AI assistant. Audio is processed in real-time and not stored." Web Speech API processes locally; only text is sent to server. |
| Data retention | MEDIUM | Must justify all data stored | Clear retention policies per data type. Auto-expiry for transient data. "Delete all data" in settings. |
| AI hallucinations | MEDIUM | AI generating false information | System prompt includes hard rules against fabrication. Fallback responses when uncertain. Web search for factual verification. |
| Subscription practices | MEDIUM | Apple scrutinizes subscription apps | Clear pricing before purchase. Easy cancellation. No dark patterns. Restore purchases button. |
| User-generated content | LOW | Thoughts, notes could contain sensitive content | Content stays private (RLS). No moderation of private content. E2E encryption planned for sensitive notes. |
| Health-adjacent features | MEDIUM | Habit tracking, meal planning could be seen as health advice | Clear disclaimers: "This is not medical or nutritional advice." No calorie counting or diet recommendations without user initiation. |

### Review-Safe Language

**Do say:**
- "AI-powered personal organizer"
- "Smart scheduling assistant"
- "Helps you plan your day"
- "Tracks your habits and goals"

**Don't say:**
- "AI that runs your life" (implies autonomous control)
- "Reads your emails" (implies surveillance; say "connects to your email with your permission")
- "Monitors your behavior" (implies tracking; say "learns your preferences when you enable Learning Mode")
- "Health tracker" (implies medical device; say "habit and routine tracker")

### Pre-Submission Checklist

- [ ] All permissions have clear purpose strings in Info.plist
- [ ] Privacy nutrition labels accurately reflect data collection
- [ ] "Delete Account" feature is accessible from Settings
- [ ] Subscription terms are clear before purchase
- [ ] AI-generated content is labeled as such
- [ ] No background location tracking
- [ ] Voice processing disclosure is accurate
- [ ] Restore Purchases button exists
- [ ] App works without any permissions granted (graceful degradation)
- [ ] No web-only features that bypass App Store payment (for in-app content)

---

## SECTION 6 — ENGINEERING GUIDELINES

### Coding Standards

**Language:** TypeScript (strict mode). No `any` types in new code (legacy `any` casts for Supabase are acceptable until types are generated).

**Style:** Airbnb JavaScript Style Guide as baseline, with these overrides:
- Prefer `const` over `let`. Never use `var`.
- Prefer named exports over default exports (except Next.js pages).
- Prefer `interface` over `type` for object shapes.
- Use `cn()` for conditional class merging (never string concatenation).
- camelCase for frontend, snake_case for database columns. Transform at the API boundary.

**File Organization:**
```
src/
  app/           # Next.js App Router pages and API routes
  components/    # React components (organized by feature)
  state/         # Redux slices, hooks, store
  lib/           # Utilities, services, helpers
  types/         # TypeScript type definitions
  hooks/         # Custom React hooks
```

**Component Rules:**
- One component per file (except small helper components used only by the parent)
- Components that fetch data use Redux selectors, not direct Supabase calls
- All API calls go through Redux thunks or API route handlers
- No business logic in components — extract to hooks, slices, or lib functions

### AI Safety Rules

1. **No autonomous writes.** The AI never creates, updates, or deletes user data without explicit user intent parsed from their message.
2. **No hallucinated data.** If the AI doesn't have information, it says so. It never fabricates memories, events, or statistics.
3. **No sensitive inference.** The AI never infers or stores: health diagnoses, political views, sexual orientation, religious beliefs, financial status.
4. **No irreversible AI actions.** Every AI action can be undone. Delete = soft-delete with 30-day recovery window.
5. **Graceful degradation.** If the AI API is down, the app works without AI features. Schedule, tasks, habits all function offline.
6. **Rate limiting.** All AI endpoints are rate-limited per user. Free: 30 msg/day. Pro: 200 msg/day. Hard limit: 500/day regardless of plan.
7. **Input sanitization.** All user inputs are validated before being passed to the AI. No prompt injection via task titles, habit names, or memory content.
8. **Output validation.** AI responses are parsed as JSON. If parsing fails, raw text is returned safely. No eval() or dynamic code execution from AI output.

### Feature Flag Strategy

Feature flags control rollout of new features and provide kill-switch capability.

**Implementation:**
```typescript
// Feature flags stored in Supabase 'feature_flags' table
interface FeatureFlag {
  name: string           // 'voice_mode', 'web_search', 'kanban_view'
  enabled: boolean       // Global on/off
  rollout_percentage: number  // 0-100 for gradual rollout
  plan_required: string | null  // null = all, 'pro' = pro only
  kill_switch: boolean   // true = force-disabled regardless of other settings
}

// Usage in API routes:
const isEnabled = await checkFeatureFlag('voice_mode', userId)
```

**Rules:**
- Every new feature ships behind a flag
- Flags are checked server-side (not client-side) for security
- Kill switches can be activated from the Supabase dashboard in < 1 minute
- Feature flags are cached for 5 minutes to reduce database load

### Kill-Switch Architecture

Critical features have kill switches that can be activated instantly:

| Feature | Kill Switch | Fallback Behavior |
|---------|-------------|-------------------|
| AI Assistant | Disable all AI responses | Show "AI is temporarily unavailable" with manual-only mode |
| Web Search | Disable search tool | AI responds from knowledge only |
| Voice Mode | Disable TTS/STT | Text-only chat |
| Automations | Pause all rules | No automated actions execute |
| Learning Pipeline | Stop pattern analysis | Existing patterns preserved, no new ones created |
| Push Notifications | Disable all sends | In-app only |

**Activation:** Set `kill_switch = true` on the relevant feature flag in Supabase. Takes effect within 5 minutes (cache TTL).

### Observability & Logging

**What we log:**
- API route invocations (route, method, status code, duration)
- AI response generation (model, token count, latency, success/failure)
- Action executions (intent, success/failure, error message)
- Feature flag evaluations (flag name, result)
- Subscription events (upgrade, downgrade, cancellation)

**What we NEVER log:**
- User message content (privacy)
- AI response content (privacy)
- Personal data (names, emails in logs)
- Authentication tokens or secrets

**Format:** Structured JSON logs with correlation IDs for request tracing.

**Philosophy:** Log the shape of behavior, never the content. We should be able to debug "the AI failed to respond" without knowing what the user asked.

---

## SECTION 7 — FOUNDER PRINCIPLES

### Product Philosophy

**We are building a life OS, not a todo app.**

The difference: A todo app shows you what to do. A life OS understands why you do what you do, helps you do it better, and adapts when life changes. Every feature we build should pass the test: "Does this help the user feel more in control of their life?"

### AI Trust Doctrine

Trust is earned in drops and lost in buckets. Our AI earns trust through:

1. **Transparency.** Every AI decision is explainable. The user can always ask "why?" and get a real answer.
2. **Reversibility.** Every AI action can be undone. No permanent consequences without explicit confirmation.
3. **Humility.** The AI admits when it doesn't know. It asks when it's unsure. It never pretends to be certain when it isn't.
4. **Restraint.** The AI does less than it could. It suggests rather than acts. It asks rather than assumes. Autonomy is earned through demonstrated trust.
5. **Privacy.** The AI forgets by default. Learning is opt-in. Data retention is minimal. The user controls what the AI knows.

### UX Decision Rules

When facing a design decision, apply these rules in order:

1. **Reduce cognitive load.** If a feature adds complexity without proportional value, cut it.
2. **Mobile-first.** If it doesn't work beautifully on a phone, it's not done.
3. **Progressive disclosure.** Show the simple version first. Advanced features reveal themselves when needed.
4. **Delight through intelligence.** The best animations and micro-interactions are the ones that make the AI feel alive and attentive, not decorative.
5. **Respect attention.** Every notification, every modal, every alert costs the user's attention. Spend it wisely.

### What We Never Do

1. **Never sell user data.** Not anonymized, not aggregated, not ever. This is non-negotiable.
2. **Never use dark patterns.** No misleading UI, no hidden charges, no manipulative notifications, no shame-based engagement ("You missed 5 days!").
3. **Never auto-charge without clear consent.** Subscriptions require explicit opt-in with clear pricing.
4. **Never make the AI pretend to be human.** The AI is an AI. It's helpful, personable, and intelligent — but it's always clear it's an AI assistant.
5. **Never store more data than needed.** If we don't need it for a feature the user is using, we don't collect it.
6. **Never punish free users.** Free tier is genuinely useful, not a crippled version designed to frustrate people into paying.
7. **Never compromise on security.** RLS on every table. Input validation on every endpoint. Encryption in transit and at rest. No exceptions.
8. **Never ship without a kill switch.** Every feature that can fail must be disableable in under 5 minutes.

### Long-Term Vision

**Year 1:** Best-in-class personal life organizer with AI that genuinely helps. Calendar, tasks, habits, meals, thoughts — all connected through an intelligent assistant that learns and adapts.

**Year 2:** Platform expansion. Third-party integrations (Google Calendar, Outlook, Todoist, Apple Health). API for developers. Team/family shared planning.

**Year 3:** Predictive life management. The AI doesn't just respond — it anticipates. "Based on your patterns, I've drafted next week's schedule. Want to review it?" Proactive health and wellness suggestions (within safe boundaries). Life dashboard that shows the big picture.

**The north star:** An AI that knows you well enough to handle the boring parts of life, so you can focus on what matters.

---

*This handbook is a living document. Update it as the product evolves. Every engineer should read it before writing their first line of code.*
