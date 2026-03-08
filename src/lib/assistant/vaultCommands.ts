/**
 * Vault Commands — Obsidian-inspired slash commands for the AI assistant.
 * Each command fetches deep cross-domain context from the user's data and
 * passes it to Claude with a specialized prompt so it can surface patterns,
 * build daily briefs, trace idea evolution, and more.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Sanitize user-provided args before embedding them in Claude prompts.
 * Strips newlines, prompt-injection patterns, and limits length.
 */
function sanitizeArg(arg: string, maxLength = 200): string {
  return arg
    .replace(/[\r\n]+/g, ' ')           // no newlines (cross-prompt injection)
    .replace(/---+/g, '')                // no markdown separators
    .replace(/system\s*:/gi, '')         // no "system:" prefix injection
    .replace(/\[INST\]|\[\/INST\]/gi, '') // no instruction tags
    .trim()
    .slice(0, maxLength)
}

export interface VaultCommand {
  name: string
  trigger: string          // what the user types e.g. "/today"
  description: string
  usage: string
  icon: string
}

export const VAULT_COMMANDS: VaultCommand[] = [
  {
    name: 'Knowledge Brief',
    trigger: '/today',
    description: 'Pulls your recent notes, connections & insights into a focused thinking brief',
    usage: '/today',
    icon: '🌅',
  },
  {
    name: 'Reflect',
    trigger: '/end-day',
    description: 'Reviews your recent ideas and surfaces the 3 most important threads to develop next',
    usage: '/end-day',
    icon: '🌙',
  },
  {
    name: 'Emerge',
    trigger: '/emerge',
    description: "Scans your knowledge graph for patterns and connections you haven't consciously noticed",
    usage: '/emerge',
    icon: '🔮',
  },
  {
    name: 'Focus Check',
    trigger: '/drift',
    description: 'Compares your stated focus areas against the ideas you have actually been capturing',
    usage: '/drift',
    icon: '📊',
  },
  {
    name: 'Trace',
    trigger: '/trace',
    description: 'Tracks how a specific idea or topic has evolved across your thoughts & tasks',
    usage: '/trace [topic]',
    icon: '🧬',
  },
  {
    name: 'Ideas',
    trigger: '/ideas',
    description: 'Cross-domain pattern detection — generates ideas across all your life areas',
    usage: '/ideas',
    icon: '💡',
  },
  {
    name: 'Connect',
    trigger: '/connect',
    description: 'Finds surprising connections between two topics in your data',
    usage: '/connect [topic A] and [topic B]',
    icon: '🔗',
  },
  {
    name: 'Ghost',
    trigger: '/ghost',
    description: 'Answers a question exactly the way you would, built from your notes & patterns',
    usage: '/ghost [question]',
    icon: '👻',
  },
]

export function detectCommand(content: string): { command: VaultCommand; args: string } | null {
  const trimmed = content.trim()
  for (const cmd of VAULT_COMMANDS) {
    if (trimmed.toLowerCase().startsWith(cmd.trigger)) {
      const args = trimmed.slice(cmd.trigger.length).trim()
      return { command: cmd, args }
    }
  }
  return null
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>

async function fetchThoughts(userId: string, supabase: SupabaseClient, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('thoughts')
    .select('raw_content, processed_content, category, tags, created_at')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(60)
  return data || []
}

async function fetchTasks(userId: string, supabase: SupabaseClient, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('tasks')
    .select('title, description, status, priority, due_date, completed_at, created_at, project_id')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}

async function fetchTodayTasks(userId: string, supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('tasks')
    .select('title, status, priority, due_date')
    .eq('user_id', userId)
    .neq('status', 'completed')
    .or(`due_date.eq.${today},due_date.lt.${today}`)
    .order('priority', { ascending: true })
    .limit(20)
  return data || []
}

async function fetchHabitsWithStats(userId: string, supabase: SupabaseClient) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const [habitsRes, completionsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('id, name, frequency, category, reminder_time, is_active')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('user_id', userId)
      .gte('completed_date', since),
  ])

  const habits = habitsRes.data || []
  const completions = completionsRes.data || []

  const completionsByHabit = new Map<string, string[]>()
  for (const c of completions) {
    if (!completionsByHabit.has(c.habit_id)) completionsByHabit.set(c.habit_id, [])
    completionsByHabit.get(c.habit_id)!.push(c.completed_date)
  }

  return habits.map(h => {
    const dates = completionsByHabit.get(h.id) || []
    const completedToday = dates.includes(today)
    const rate30 = Math.round((dates.length / 30) * 100)
    return { ...h, completedToday, completionRate30d: rate30, totalCompletions30d: dates.length }
  })
}

async function fetchTodayCalendar(userId: string, supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('calendar_events')
    .select('title, description, start_time, end_time, location')
    .eq('user_id', userId)
    .gte('start_time', `${today}T00:00:00`)
    .lte('start_time', `${today}T23:59:59`)
    .order('start_time', { ascending: true })
  return data || []
}

async function fetchTodayTimeEntries(userId: string, supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('time_entries')
    .select('start_time, end_time, duration_seconds, task_id')
    .eq('user_id', userId)
    .gte('start_time', `${today}T00:00:00`)
    .order('start_time', { ascending: true })
  return data || []
}

async function fetchRecentCalendar(userId: string, supabase: SupabaseClient, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('calendar_events')
    .select('title, description, start_time, category')
    .eq('user_id', userId)
    .gte('start_time', since)
    .order('start_time', { ascending: false })
    .limit(60)
  return data || []
}

// ─── Command Handlers ─────────────────────────────────────────────────────────

export interface CommandContext {
  commandName: string
  dataContext: string       // formatted text block to inject into Claude's prompt
  systemInstruction: string // specialized instruction for Claude
}

export async function handleTodayCommand(
  userId: string,
  supabase: SupabaseClient
): Promise<CommandContext> {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const [events, tasks, habits, thoughts] = await Promise.all([
    fetchTodayCalendar(userId, supabase),
    fetchTodayTasks(userId, supabase),
    fetchHabitsWithStats(userId, supabase),
    fetchThoughts(userId, supabase, 3),
  ])

  const pendingHabits = habits.filter(h => !h.completedToday)

  const dataContext = `
TODAY: ${today}

CALENDAR TODAY:
${events.length ? events.map(e => `• ${e.start_time?.split('T')[1]?.slice(0, 5) ?? '?'} — ${e.title}${e.location ? ` @ ${e.location}` : ''}`).join('\n') : '• No events scheduled'}

OVERDUE / DUE TODAY TASKS:
${tasks.length ? tasks.map(t => `• [${t.priority === 1 ? 'HIGH' : t.priority === 2 ? 'MED' : 'LOW'}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`).join('\n') : '• No tasks due'}

PENDING HABITS:
${pendingHabits.length ? pendingHabits.map(h => `• ${h.name} (30d rate: ${h.completionRate30d}%)`).join('\n') : '• All habits completed ✓'}

RECENT THOUGHTS (last 3 days):
${thoughts.slice(0, 6).map(t => `• ${t.raw_content?.slice(0, 120)}`).join('\n') || '• No recent thoughts captured'}
`.trim()

  return {
    commandName: '/today',
    dataContext,
    systemInstruction: `The user ran /today — their morning brief command. Using the data above, create a concise, prioritised daily briefing.
Format it as:
1. **Situation** — 1-2 sentences on what today looks like
2. **Top 3 Priorities** — ranked by impact, considering their calendar + tasks + what they've been thinking about
3. **Watch Out** — any conflicts, overload, or misalignment between calendar and their recent thoughts
4. **Protocol Check** — which habits still need completing and are highest-streak risk

Be tactical. Be direct. This is a mission brief, not a motivational speech.`,
  }
}

export async function handleEndDayCommand(
  userId: string,
  supabase: SupabaseClient
): Promise<CommandContext> {
  const today = new Date().toISOString().split('T')[0]

  const [events, timeEntries, allTasks, habits] = await Promise.all([
    fetchTodayCalendar(userId, supabase),
    fetchTodayTimeEntries(userId, supabase),
    fetchTasks(userId, supabase, 1),
    fetchHabitsWithStats(userId, supabase),
  ])

  const completedTasks = allTasks.filter(t => t.status === 'completed')
  const incompleteTasks = allTasks.filter(t => t.status !== 'completed' && t.due_date === today)
  const totalSeconds = timeEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  const hoursWorked = (totalSeconds / 3600).toFixed(1)
  const completedHabits = habits.filter(h => h.completedToday)
  const missedHabits = habits.filter(h => !h.completedToday)

  const dataContext = `
TODAY: ${today}

TIME TRACKED: ${hoursWorked}h across ${timeEntries.length} sessions

EVENTS THAT HAPPENED:
${events.map(e => `• ${e.title}`).join('\n') || '• None'}

TASKS COMPLETED TODAY:
${completedTasks.length ? completedTasks.map(t => `• ✓ ${t.title}`).join('\n') : '• None marked complete'}

TASKS STILL OPEN (due today):
${incompleteTasks.length ? incompleteTasks.map(t => `• ○ ${t.title}`).join('\n') : '• None outstanding'}

HABITS:
Completed: ${completedHabits.map(h => h.name).join(', ') || 'none'}
Missed: ${missedHabits.map(h => h.name).join(', ') || 'none'}
`.trim()

  return {
    commandName: '/end-day',
    dataContext,
    systemInstruction: `The user ran /end-day — their evening review command. Using the data above, provide:
1. **Day Summary** — what actually got done vs. what was planned (be honest)
2. **Wins** — genuine progress made today
3. **Carry Forward** — top 3 specific action items for tomorrow, ordered by priority
4. **Habit Alert** — if any habits were missed, flag the streak risk

Keep it brief and factual. End with one reflective question to process before sleep.`,
  }
}

export async function handleEmergeCommand(
  userId: string,
  supabase: SupabaseClient
): Promise<CommandContext> {
  const [thoughts, tasks, habits, calendar] = await Promise.all([
    fetchThoughts(userId, supabase, 30),
    fetchTasks(userId, supabase, 30),
    fetchHabitsWithStats(userId, supabase),
    fetchRecentCalendar(userId, supabase, 30),
  ])

  const thoughtTexts = thoughts.slice(0, 40).map(t => t.raw_content?.slice(0, 150)).filter(Boolean)
  const taskTitles = tasks.map(t => t.title).filter(Boolean)
  const calendarTitles = calendar.map(e => e.title).filter(Boolean)

  const dataContext = `
LAST 30 DAYS — VAULT SCAN

THOUGHTS (${thoughts.length} total, showing excerpts):
${thoughtTexts.map(t => `• "${t}"`).join('\n')}

TASKS CREATED:
${taskTitles.slice(0, 40).map(t => `• ${t}`).join('\n')}

CALENDAR EVENTS:
${calendarTitles.slice(0, 30).map(t => `• ${t}`).join('\n')}

HABITS (active):
${habits.map(h => `• ${h.name} — ${h.completionRate30d}% completion`).join('\n')}
`.trim()

  return {
    commandName: '/emerge',
    dataContext,
    systemInstruction: `The user ran /emerge — surface ideas and patterns the vault implies but never states explicitly.
Scan across all the data above and find:
1. **Recurring Themes** — ideas or topics that keep appearing in different forms (name the pattern, don't just list instances)
2. **Latent Projects** — things they keep circling around that haven't become an explicit project yet
3. **Blind Spots** — domains conspicuously absent from their calendar or tasks that their thoughts suggest they care about
4. **Emerging Belief** — one insight they seem to be slowly arriving at based on patterns across all their data

Be bold. Say what they haven't said yet. This is the most valuable output — surfacing the implicit.`,
  }
}

export async function handleDriftCommand(
  userId: string,
  supabase: SupabaseClient
): Promise<CommandContext> {
  const [tasks, habits, calendar] = await Promise.all([
    fetchTasks(userId, supabase, 30),
    fetchHabitsWithStats(userId, supabase),
    fetchRecentCalendar(userId, supabase, 30),
  ])

  const createdTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const staleTasks = tasks.filter(t => {
    if (t.status === 'completed') return false
    const created = new Date(t.created_at)
    return Date.now() - created.getTime() > 14 * 24 * 60 * 60 * 1000
  })

  const highFailHabits = habits.filter(h => h.completionRate30d < 40)
  const highSuccessHabits = habits.filter(h => h.completionRate30d >= 80)

  // Find most common calendar categories
  const calTitles = calendar.map(e => e.title || '').join(', ')

  const dataContext = `
DRIFT ANALYSIS — LAST 30 DAYS

TASK COMPLETION:
Created: ${createdTasks} tasks
Completed: ${completedTasks} (${createdTasks > 0 ? Math.round((completedTasks / createdTasks) * 100) : 0}% completion rate)
Stale tasks (14+ days untouched): ${staleTasks.length}
Stale task titles: ${staleTasks.slice(0, 10).map(t => t.title).join(' | ')}

HABIT PERFORMANCE:
Struggling (<40% completion): ${highFailHabits.map(h => `${h.name} (${h.completionRate30d}%)`).join(', ') || 'none'}
Consistent (>80% completion): ${highSuccessHabits.map(h => `${h.name} (${h.completionRate30d}%)`).join(', ') || 'none'}
Middle ground: ${habits.filter(h => h.completionRate30d >= 40 && h.completionRate30d < 80).map(h => `${h.name} (${h.completionRate30d}%)`).join(', ') || 'none'}

CALENDAR ACTIVITY (what actually got time):
${calTitles.slice(0, 400)}
`.trim()

  return {
    commandName: '/drift',
    dataContext,
    systemInstruction: `The user ran /drift — compare stated intentions against actual behaviour.
Using the data, be brutally honest about:
1. **The Gap** — specific areas where behaviour doesn't match intentions (stale tasks = stated priorities they're avoiding)
2. **What You're Actually Doing** — inferred from calendar + completed tasks — what is their time actually going to?
3. **The Avoidance Pattern** — the stale tasks are usually the most important. Name what they're avoiding and speculate why.
4. **One Honest Reframe** — not a fix, just an honest observation about the drift

Don't be cruel but don't sugarcoat. This command exists to break self-deception.`,
  }
}

export async function handleTraceCommand(
  userId: string,
  supabase: SupabaseClient,
  topic: string
): Promise<CommandContext> {
  if (!topic) {
    return {
      commandName: '/trace',
      dataContext: '',
      systemInstruction: 'Tell the user they need to provide a topic: /trace [topic]. Example: /trace productivity',
    }
  }

  topic = sanitizeArg(topic)
  const searchTerm = topic.toLowerCase()

  const [thoughts, tasks, calendar] = await Promise.all([
    fetchThoughts(userId, supabase, 365),
    fetchTasks(userId, supabase, 365),
    fetchRecentCalendar(userId, supabase, 365),
  ])

  const matchThoughts = thoughts
    .filter(t => (t.raw_content || '').toLowerCase().includes(searchTerm))
    .map(t => ({ date: t.created_at?.split('T')[0], text: t.raw_content?.slice(0, 200), type: 'thought' }))

  const matchTasks = tasks
    .filter(t => (t.title + ' ' + (t.description || '')).toLowerCase().includes(searchTerm))
    .map(t => ({ date: t.created_at?.split('T')[0], text: t.title, type: `task (${t.status})` }))

  const matchCalendar = calendar
    .filter(e => (e.title + ' ' + (e.description || '')).toLowerCase().includes(searchTerm))
    .map(e => ({ date: e.start_time?.split('T')[0], text: e.title, type: 'calendar event' }))

  const allMatches = [...matchThoughts, ...matchTasks, ...matchCalendar]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const dataContext = `
TRACE: "${topic}"
Searching across all thoughts, tasks, and calendar events.
Found ${allMatches.length} references over time.

CHRONOLOGICAL EVOLUTION:
${allMatches.slice(0, 40).map(m => `[${m.date}] (${m.type}): ${m.text}`).join('\n') || '• No references found for this topic'}
`.trim()

  return {
    commandName: '/trace',
    dataContext,
    systemInstruction: `The user ran /trace "${topic}" — show them how their thinking on this topic has evolved.
Using the chronological data above:
1. **First Appearance** — when and how this topic first showed up
2. **Evolution** — how their thinking/engagement with it changed over time (use specific dates/examples from the data)
3. **Current State** — where they seem to be with this topic now
4. **Trajectory** — based on the arc, what direction does this seem to be heading?

This should feel like reading a personal history of an idea. Specific and narrative.`,
  }
}

export async function handleIdeasCommand(
  userId: string,
  supabase: SupabaseClient
): Promise<CommandContext> {
  const [thoughts, tasks, habits, calendar] = await Promise.all([
    fetchThoughts(userId, supabase, 30),
    fetchTasks(userId, supabase, 30),
    fetchHabitsWithStats(userId, supabase),
    fetchRecentCalendar(userId, supabase, 30),
  ])

  // Group tasks by rough domain (based on first word patterns)
  const taskDomains = tasks.map(t => t.title).slice(0, 50)
  const thoughtSnippets = thoughts.slice(0, 30).map(t => t.raw_content?.slice(0, 100)).filter(Boolean)
  const habitAreas = habits.map(h => `${h.name} (${h.category || 'general'})`).join(', ')
  const calAreas = calendar.slice(0, 20).map(e => e.title).join(', ')

  const dataContext = `
CROSS-DOMAIN VAULT SCAN FOR IDEA GENERATION

THOUGHT FRAGMENTS (recent):
${thoughtSnippets.map(t => `• "${t}"`).join('\n')}

ACTIVE PROJECTS/TASKS:
${taskDomains.map(t => `• ${t}`).join('\n')}

HABITS (life areas being cultivated):
${habitAreas}

RECENT CALENDAR (what's getting time):
${calAreas}
`.trim()

  return {
    commandName: '/ideas',
    dataContext,
    systemInstruction: `The user ran /ideas — perform cross-domain idea generation from all their life data.
Look for unexpected connections across different domains in their data and generate:
1. **5 Specific Ideas** — each one must draw from AT LEAST 2 different domains visible in their data. Be concrete, not generic.
2. **The Hidden Opportunity** — one larger opportunity they seem uniquely positioned for based on their combination of habits/tasks/interests
3. **One Wild Card** — an idea that's a bigger leap but is implied by the patterns

Ideas should be actionable, specific to THEIR data, and surprising. Avoid generic productivity advice.`,
  }
}

export async function handleConnectCommand(
  userId: string,
  supabase: SupabaseClient,
  args: string
): Promise<CommandContext> {
  args = sanitizeArg(args)
  // Parse "topic A and topic B" or just "topic A topic B"
  const parts = args.toLowerCase().split(/\s+and\s+|\s*,\s*/)
  const topicA = parts[0]?.trim()
  const topicB = parts[1]?.trim()

  if (!topicA || !topicB) {
    return {
      commandName: '/connect',
      dataContext: '',
      systemInstruction: 'Tell the user they need to provide two topics: /connect [topic A] and [topic B]. Example: /connect fitness and coding',
    }
  }

  const [thoughts, tasks, calendar] = await Promise.all([
    fetchThoughts(userId, supabase, 180),
    fetchTasks(userId, supabase, 180),
    fetchRecentCalendar(userId, supabase, 180),
  ])

  const allText = [
    ...thoughts.map(t => ({ source: 'thought', date: t.created_at?.split('T')[0], text: t.raw_content || '' })),
    ...tasks.map(t => ({ source: 'task', date: t.created_at?.split('T')[0], text: t.title + ' ' + (t.description || '') })),
    ...calendar.map(e => ({ source: 'event', date: e.start_time?.split('T')[0], text: e.title + ' ' + (e.description || '') })),
  ]

  const matchA = allText.filter(x => x.text.toLowerCase().includes(topicA)).slice(0, 15)
  const matchB = allText.filter(x => x.text.toLowerCase().includes(topicB)).slice(0, 15)
  const matchBoth = allText.filter(x => x.text.toLowerCase().includes(topicA) && x.text.toLowerCase().includes(topicB))

  const dataContext = `
CONNECT: "${topicA}" ↔ "${topicB}"

REFERENCES TO "${topicA}":
${matchA.map(x => `[${x.date}] (${x.source}): ${x.text.slice(0, 120)}`).join('\n') || '• None found'}

REFERENCES TO "${topicB}":
${matchB.map(x => `[${x.date}] (${x.source}): ${x.text.slice(0, 120)}`).join('\n') || '• None found'}

ENTRIES MENTIONING BOTH:
${matchBoth.map(x => `[${x.date}] (${x.source}): ${x.text.slice(0, 150)}`).join('\n') || '• No direct overlap found'}
`.trim()

  return {
    commandName: '/connect',
    dataContext,
    systemInstruction: `The user ran /connect — find the bridge between "${topicA}" and "${topicB}" within their own life data.
Using the references above:
1. **Direct Links** — any places where both topics already appeared together
2. **Indirect Bridge** — the conceptual or practical connection between these two domains in their specific context
3. **The Synthesis** — what could emerge if they intentionally combined these two areas? Be specific to their data.
4. **Next Step** — one concrete action to start building this bridge

This should feel like a creative breakthrough, not just information retrieval.`,
  }
}

export async function handleGhostCommand(
  userId: string,
  supabase: SupabaseClient,
  question: string
): Promise<CommandContext> {
  if (!question) {
    return {
      commandName: '/ghost',
      dataContext: '',
      systemInstruction: 'Tell the user they need to provide a question: /ghost [question]. Example: /ghost what do I think about AI?',
    }
  }

  question = sanitizeArg(question)

  const [thoughts, habits, tasks] = await Promise.all([
    fetchThoughts(userId, supabase, 60),
    fetchHabitsWithStats(userId, supabase),
    fetchTasks(userId, supabase, 60),
  ])

  const thoughtSamples = thoughts.slice(0, 20).map(t => t.raw_content?.slice(0, 200)).filter(Boolean)
  const habitProfile = habits.map(h => `${h.name}: ${h.completionRate30d}% consistent`).join(', ')
  const recentProjects = tasks.slice(0, 15).map(t => t.title).join(', ')

  const dataContext = `
GHOST MODE — QUESTION: "${question}"

VOICE PROFILE (built from recent thoughts):
${thoughtSamples.map(t => `"${t}"`).join('\n---\n')}

WHAT THEY'RE WORKING ON:
${recentProjects}

HOW THEY LIVE (habits):
${habitProfile}
`.trim()

  return {
    commandName: '/ghost',
    dataContext,
    systemInstruction: `The user ran /ghost — answer their question exactly as THEY would answer it, built from their own notes and patterns.
Question: "${question}"

Instructions:
1. Study the voice profile above — their sentence length, directness, vocabulary, what they emphasize
2. Answer the question AS THEM, in their voice, based on what their data suggests they actually believe
3. After answering in their voice, add a brief "Fidelity Check" — rate how confident you are this reflects their actual view (0-100%) and what you're uncertain about

Do NOT answer in a generic AI voice. Channel their specific way of thinking and speaking.`,
  }
}
