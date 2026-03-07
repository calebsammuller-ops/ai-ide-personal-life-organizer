import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { executeIntent, ActionResult } from '@/lib/assistant/intentHandler'
import { triggerLearning, getConversationMessageCount } from '@/lib/assistant/learningPipeline'
import { getTopMemories, formatMemoriesForPrompt } from '@/lib/assistant/memoryExtractor'
import { validateBody, assistantMessageSchema } from '@/lib/validations'
import { canUseFeature, incrementUsage } from '@/lib/stripe/subscriptionService'
import { isWebSearchEnabled } from '@/lib/ai/webSearch'
import { classifyIntent, buildAgentContext, runAgent, logDecision } from '@/lib/assistant/agents/router'
import { recordSignal } from '@/lib/activitySignals'
import { checkFeatureFlag } from '@/lib/featureFlags'
import { detectGrowthPhase } from '@/lib/assistant/growthPath'
import { getLatestReflection } from '@/lib/assistant/weeklyReflection'
import {
  detectCommand,
  handleTodayCommand,
  handleEndDayCommand,
  handleEmergeCommand,
  handleDriftCommand,
  handleTraceCommand,
  handleIdeasCommand,
  handleConnectCommand,
  handleGhostCommand,
} from '@/lib/assistant/vaultCommands'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssistantMessage, CalendarEvent, Habit, MealPlan, UserPreferences, LearnedPatterns, UserMemory, GrowthPhase, SystemPersona } from '@/types'
import { GROWTH_PHASE_CONFIG, SYSTEM_PERSONA_CONFIG } from '@/types'

export const maxDuration = 60

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface SuggestedAction {
  label: string
  action: string
  icon: string
}

interface AIResponse {
  content: string
  intent: string | null
  entities: Record<string, unknown>
  suggestedActions: SuggestedAction[]
  actionPayload?: Record<string, unknown>
  generatedImageUrl?: string | null
}

interface UserContext {
  todayEvents: CalendarEvent[]
  pendingHabits: Habit[]
  todayMeals: MealPlan[]
  unprocessedThoughts: number
  preferences: Partial<UserPreferences>
  learnedPatterns: LearnedPatterns | null
  userMemories: UserMemory[]
  habitStats: {
    completionRate: number
    currentStreaks: { name: string; days: number }[]
  }
  projects: { id: string; name: string; status: string; description: string | null }[]
  pendingTasks: { id: string; title: string; priority: string; deadline: string | null; projectId: string | null }[]
  knowledgeNotes: { zettel_id: string; title: string; type: string; content: string; tags: string[]; confidence: number; importance: number }[]
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assistant_messages')
    .select('*')
    .eq('user_id', user.id)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  console.log('[Assistant] POST request received')

  const supabase = createClient()
  // db is a base SupabaseClient without the Database generic — used for tables
  // not yet included in the auto-generated Database type definition.
  const db = supabase as unknown as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[Assistant] No session - unauthorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[Assistant] Session valid for user:', user.id)

  // Validate request body
  const validation = await validateBody(request, assistantMessageSchema)
  if (!validation.success) {
    console.log('[Assistant] Validation failed:', validation.error)
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  console.log('[Assistant] Request body validated')

  const body = validation.data
  const conversationId = body.conversationId || crypto.randomUUID()

  // Check if user can send AI messages (subscription limit)
  const aiMessageCheck = await canUseFeature(user.id, 'ai_message')
  if (!aiMessageCheck.allowed) {
    return NextResponse.json({
      error: 'Message limit reached',
      message: aiMessageCheck.reason,
      upgradeRequired: true,
    }, { status: 429 })
  }

  // Track AI message usage
  await incrementUsage(user.id, 'ai_message')

  // Create user message
  console.log('[Assistant] Creating user message in database')
  const { data: userMessage, error: userError } = await db
    .from('assistant_messages')
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'user',
      content: body.content,
    })
    .select()
    .single()

  if (userError) {
    console.error('[Assistant] Database error creating message:', userError.message)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }
  console.log('[Assistant] User message created successfully')

  // ── Vault Command Detection ───────────────────────────────────────────────
  // If the message is a slash command, run a deep data-fetch + specialized
  // Claude prompt and return early — bypassing the normal intent pipeline.
  const vaultCmd = detectCommand(body.content)
  if (vaultCmd) {
    console.log(`[Assistant] Vault command detected: ${vaultCmd.command.trigger}`)
    try {
      let cmdCtx
      switch (vaultCmd.command.trigger) {
        case '/today':    cmdCtx = await handleTodayCommand(user.id, supabase); break
        case '/end-day':  cmdCtx = await handleEndDayCommand(user.id, supabase); break
        case '/emerge':   cmdCtx = await handleEmergeCommand(user.id, supabase); break
        case '/drift':    cmdCtx = await handleDriftCommand(user.id, supabase); break
        case '/trace':    cmdCtx = await handleTraceCommand(user.id, supabase, vaultCmd.args); break
        case '/ideas':    cmdCtx = await handleIdeasCommand(user.id, supabase); break
        case '/connect':  cmdCtx = await handleConnectCommand(user.id, supabase, vaultCmd.args); break
        case '/ghost':    cmdCtx = await handleGhostCommand(user.id, supabase, vaultCmd.args); break
        default: cmdCtx = null
      }

      if (cmdCtx) {
        const cmdSystemPrompt = `You are a powerful personal AI strategist with deep access to the user's life data — their thoughts, tasks, habits, calendar events, and time tracking. You are running the ${cmdCtx.commandName} command.

${cmdCtx.systemInstruction}

Here is the user's data for this command:
---
${cmdCtx.dataContext}
---

Respond in a structured, tactical way. Use markdown with headers and bullet points. Be specific to the data — never give generic advice. Be the thinking partner they can't get anywhere else.`

        const cmdResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: cmdSystemPrompt,
          messages: [{ role: 'user', content: body.content }],
        })

        const cmdText = cmdResponse.content.find(b => b.type === 'text')
        const cmdContent = cmdText?.type === 'text' ? cmdText.text : 'Command failed to generate a response.'

        const { data: assistantMessage, error: assistantError } = await db
          .from('assistant_messages')
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
            role: 'assistant',
            content: cmdContent,
          })
          .select()
          .single()

        if (assistantError) {
          console.error('[Assistant] Failed to save vault command response:', assistantError.message)
          return NextResponse.json({ error: assistantError.message }, { status: 500 })
        }

        return NextResponse.json({
          data: {
            userMessage,
            assistantMessage,
            conversationId,
            actionResult: null,
            agentRoute: 'vault_command',
            suggestedActions: [],
          },
        })
      }
    } catch (cmdError) {
      console.error('[Assistant] Vault command error:', cmdError)
      // Fall through to normal processing on error
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Fetch conversation history (last 10 messages for context)
  const { data: history } = await db
    .from('assistant_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  // Fetch user context
  const userContext = await fetchUserContext(user.id, supabase)

  // Check feature flag for AI assistant
  const aiFlag = await checkFeatureFlag('ai_assistant', user.id)
  if (!aiFlag.enabled) {
    return NextResponse.json({
      error: 'AI assistant is temporarily unavailable',
      message: aiFlag.reason,
    }, { status: 503 })
  }

  // Sub-Agent Router: classify intent and run specialized agent if applicable
  const classification = classifyIntent(body.content)
  let agentInsights = ''

  if (classification.route !== 'direct' && classification.route !== 'executor') {
    try {
      const agentContext = await buildAgentContext(user.id, supabase, {
        todayEvents: userContext.todayEvents.map(e => ({
          title: e.title,
          startTime: e.startTime as string,
          endTime: e.endTime as string,
        })),
        pendingHabits: userContext.pendingHabits.map(h => ({
          id: h.id,
          name: h.name,
        })),
        preferences: userContext.preferences as Record<string, unknown>,
      })

      const agentOutput = runAgent(classification.route, body.content, agentContext)
      if (agentOutput) {
        agentInsights = `\n\n[${agentOutput.agent.toUpperCase()} AGENT ANALYSIS]\n${agentOutput.response}`

        // Log agent decision
        logDecision(user.id, {
          action: `${agentOutput.agent} agent analysis for: "${body.content.substring(0, 80)}"`,
          reason: agentOutput.response.substring(0, 200),
          agent: agentOutput.agent,
          dataUsed: ['activity_signals', 'calendar', 'tasks', 'habits'],
          confidence: agentOutput.confidence,
        }, supabase).catch(console.error)
      }
    } catch (agentError) {
      console.error('[Assistant] Agent error:', agentError)
    }
  }

  // Fetch growth phase and latest weekly reflection in parallel
  const [growthResult, latestReflection] = await Promise.all([
    detectGrowthPhase(user.id, supabase).catch(() => ({ phase: 'novice' as GrowthPhase, signals: null })),
    getLatestReflection(user.id, supabase).catch(() => null),
  ])

  // Generate AI response (with agent insights injected)
  let aiResponse: AIResponse
  try {
    const messageWithContext = agentInsights
      ? `${body.content}\n\n---\nSYSTEM NOTE (from sub-agent, use to inform your response but do not repeat verbatim):\n${agentInsights}`
      : body.content
    console.log('[Assistant] Generating AI response for:', body.content.substring(0, 50))
    aiResponse = await generateAIResponse(
      messageWithContext,
      (history || []) as AssistantMessage[],
      userContext,
      user.id,
      body.responseStyle,
      body.pageContext,
      growthResult.phase,
      latestReflection,
      body.attachment
    )
    console.log('[Assistant] AI response generated successfully')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[Assistant] AI response error:', errMsg)
    console.error('[Assistant] Error stack:', error instanceof Error ? error.stack : 'No stack')
    // Return specific error context to help diagnose
    aiResponse = {
      content: `I ran into an issue processing that request. Error: ${errMsg.slice(0, 120)}. Please try rephrasing or try again.`,
      intent: null,
      entities: {},
      suggestedActions: getDefaultSuggestedActions(),
    }
  }

  // Attach generated image URL to action result if present
  let actionResult: ActionResult | null = null
  if (aiResponse.generatedImageUrl) {
    actionResult = {
      success: true,
      message: 'Image generated successfully.',
      data: { generatedImageUrl: aiResponse.generatedImageUrl },
    }
  }

  // Execute intent-based action if present
  if (aiResponse.intent && aiResponse.actionPayload) {
    try {
      actionResult = await executeIntent(
        aiResponse.intent,
        aiResponse.actionPayload,
        user.id,
        supabase
      )

      // Append action result to response content
      if (actionResult.success) {
        aiResponse.content += `\n\n${actionResult.message}`
      } else {
        aiResponse.content += `\n\nI wasn't able to complete that action: ${actionResult.message}`
      }

      // Log executor decision
      logDecision(user.id, {
        action: `Executed ${aiResponse.intent}: ${actionResult.message.substring(0, 100)}`,
        reason: `User requested: "${body.content.substring(0, 100)}"`,
        agent: 'executor',
        dataUsed: ['user_message', 'intent_classification'],
        confidence: 0.9,
        undoInstructions: getUndoInstructions(aiResponse.intent),
      }, supabase).catch(console.error)

      // Record activity signal for the action
      recordSignal(
        user.id,
        actionResult.success ? 'ai_suggestion_accepted' : 'ai_suggestion_ignored',
        { intent: aiResponse.intent, success: actionResult.success },
        supabase
      ).catch(console.error)
    } catch (error) {
      console.error('Intent execution error:', error)
    }
  }

  // Save assistant message (only use columns that exist in the database)
  console.log('[Assistant] Saving assistant message to database')
  const { data: assistantMessage, error: assistantError } = await db
    .from('assistant_messages')
    .insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse.content,
    })
    .select()
    .single()

  if (assistantError) {
    console.error('[Assistant] Failed to save assistant message:', assistantError.message)
    return NextResponse.json({ error: assistantError.message }, { status: 500 })
  }
  console.log('[Assistant] Assistant message saved successfully')

  // Save conversation exchange to ai_decisions for transparency log
  ;db.from('ai_decisions')
    .insert({
      user_id: user.id,
      agent: 'strategist',
      action: body.content.slice(0, 500),
      reason: aiResponse.content.slice(0, 1000),
      data_used: ['conversation'],
      confidence: 1.0,
      undo_instructions: null,
    })
    .then(() => {})
    .catch(console.error)

  // Trigger learning after every 5 messages in a conversation
  getConversationMessageCount(conversationId, supabase).then(count => {
    if (count >= 5 && count % 5 === 0) {
      triggerLearning(user.id, conversationId, supabase).catch(console.error)
    }
  }).catch(console.error)

  return NextResponse.json({
    data: {
      userMessage,
      assistantMessage,
      conversationId,
      actionResult,
      executedIntent: aiResponse.intent || null,
      agentRoute: classification.route,
      suggestedActions: aiResponse.suggestedActions,
    },
  })
}

async function fetchUserContext(userId: string, supabase: ReturnType<typeof createClient>): Promise<UserContext> {
  const db = supabase as unknown as SupabaseClient
  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59`
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [eventsResult, habitsResult, completionsResult, mealsResult, thoughtsResult, preferencesResult, recentCompletionsResult, projectsResult, tasksResult] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .order('start_time', { ascending: true }),
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('user_id', userId)
      .eq('completed_date', today),
    supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today),
    supabase
      .from('thoughts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_processed', false)
      .eq('is_archived', false),
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single(),
    // Fetch recent completions for habit stats
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('user_id', userId)
      .gte('completed_date', thirtyDaysAgo)
      .order('completed_date', { ascending: false }),
    // Fetch active projects
    db
      .from('projects')
      .select('id, name, status, description')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10),
    // Fetch pending tasks (not completed)
    db
      .from('tasks')
      .select('id, title, priority, deadline, project_id')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const completedHabitIds = new Set((completionsResult.data || []).map(c => c.habit_id))
  const pendingHabits = (habitsResult.data || []).filter(h => !completedHabitIds.has(h.id))
  const habits = (habitsResult.data || []) as Habit[]
  const preferences = (preferencesResult.data || {}) as Partial<UserPreferences>
  const learnedPatterns = (preferences.learnedPatterns || null) as LearnedPatterns | null
  const userMemories = getTopMemories(learnedPatterns?.userMemories || [], 15)

  // Calculate habit stats
  const habitStats = calculateHabitStats(habits, recentCompletionsResult.data || [])

  return {
    todayEvents: (eventsResult.data || []) as CalendarEvent[],
    pendingHabits: pendingHabits as Habit[],
    todayMeals: (mealsResult.data || []) as MealPlan[],
    unprocessedThoughts: (thoughtsResult.data || []).length,
    preferences,
    learnedPatterns,
    userMemories,
    habitStats,
    projects: (projectsResult.data || []) as { id: string; name: string; status: string; description: string | null }[],
    pendingTasks: (tasksResult.data || []).map((t: { id: string; title: string; priority: string | null; deadline: string | null; project_id: string | null }) => ({
      id: t.id,
      title: t.title,
      priority: t.priority || 'medium',
      deadline: t.deadline || null,
      projectId: t.project_id || null,
    })),
    knowledgeNotes: await fetchKnowledgeContext(userId, supabase),
  }
}

async function fetchKnowledgeContext(userId: string, supabase: ReturnType<typeof createClient>) {
  try {
    const db = supabase as unknown as SupabaseClient
    const { data } = await db
      .from('knowledge_notes')
      .select('zettel_id, title, type, content, tags, confidence, importance')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('importance', { ascending: false })
      .order('confidence', { ascending: false })
      .limit(40)
    return data || []
  } catch {
    return []
  }
}

function calculateHabitStats(
  habits: Habit[],
  completions: { habit_id: string; completed_date: string }[]
): { completionRate: number; currentStreaks: { name: string; days: number }[] } {
  if (habits.length === 0) {
    return { completionRate: 0, currentStreaks: [] }
  }

  // Pre-group completions by habit_id using a Map for O(1) lookups
  const completionsByHabit = new Map<string, Set<string>>()
  for (const completion of completions) {
    if (!completionsByHabit.has(completion.habit_id)) {
      completionsByHabit.set(completion.habit_id, new Set())
    }
    completionsByHabit.get(completion.habit_id)!.add(completion.completed_date)
  }

  // Calculate completion rate for last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]
  let recentCompletionCount = 0
  for (const completion of completions) {
    if (completion.completed_date >= sevenDaysAgoStr) {
      recentCompletionCount++
    }
  }
  const expectedCompletions = habits.length * 7
  const completionRate = expectedCompletions > 0
    ? Math.round((recentCompletionCount / expectedCompletions) * 100)
    : 0

  // Pre-generate date strings for streak calculation (avoids repeated Date operations)
  const today = new Date()
  const dateStrings: string[] = []
  for (let i = 0; i < 31; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dateStrings.push(d.toISOString().split('T')[0])
  }

  // Calculate current streaks using pre-grouped data
  const streaks: { name: string; days: number }[] = []
  for (const habit of habits) {
    const habitDates = completionsByHabit.get(habit.id)
    if (!habitDates) continue

    let streak = 0
    let startIndex = 0

    // Allow missing today if checking mid-day
    if (!habitDates.has(dateStrings[0])) {
      startIndex = 1
    }

    for (let i = startIndex; i < dateStrings.length; i++) {
      if (habitDates.has(dateStrings[i])) {
        streak++
      } else {
        break
      }
    }

    if (streak >= 3) {
      streaks.push({ name: habit.name, days: streak })
    }
  }

  return {
    completionRate,
    currentStreaks: streaks.sort((a, b) => b.days - a.days).slice(0, 3),
  }
}

// Define tools for Claude to use
const webSearchTool: Anthropic.Tool = {
  name: 'web_search',
  description: 'Search the internet for current information, facts, news, or answers to questions. Use this when you need up-to-date information or to verify facts. Always validate sources and cross-reference information.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find information about',
      },
      reason: {
        type: 'string',
        description: 'Brief explanation of why this search is needed',
      },
    },
    required: ['query', 'reason'],
  },
}

async function generateAIResponse(
  userMessage: string,
  conversationHistory: AssistantMessage[],
  userContext: UserContext,
  userId: string,
  responseStyle?: string,
  pageContext?: { currentRoute: string; pageTitle: string; activeView?: string; selectedItems?: { type: string; id: string; title: string }[]; visibleContent?: Record<string, unknown>; userIntent?: string | null; lastInteraction?: { type: string; target: string; timestamp: number } | null },
  growthPhase?: GrowthPhase,
  latestReflection?: import('@/types').WeeklyReflection | null,
  attachment?: { base64: string; mimeType: string; name: string }
): Promise<AIResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      content: "I'm not fully configured yet. Please ensure the ANTHROPIC_API_KEY is set.",
      intent: null,
      entities: {},
      suggestedActions: getDefaultSuggestedActions(),
    }
  }

  const today = new Date()
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const { learnedPatterns, userMemories, habitStats } = userContext

  // Build personalization section
  const memoriesSection = userMemories.length > 0
    ? `WHAT I KNOW ABOUT YOU:
${formatMemoriesForPrompt(userMemories)}`
    : ''

  const patternsSection = learnedPatterns ? buildPatternsSection(learnedPatterns) : ''
  const habitStatsSection = buildHabitStatsSection(habitStats)

  // Build learned behaviors / skills section
  const learnedBehaviors = (learnedPatterns?.learnedBehaviors as Array<{ trigger: string; action: string }> | undefined) || []
  const behaviorsSection = learnedBehaviors.length > 0
    ? `LEARNED SKILLS (custom user-defined shortcuts — execute these exactly when triggered):
${learnedBehaviors.map(b => `  • When user says "${b.trigger}" → ${b.action}`).join('\n')}
When any of these trigger phrases appear in the user's message, execute the corresponding action immediately using the appropriate intent(s). Do not ask for confirmation unless the action is irreversible.`
    : ''

  // Get response preferences — user setting overrides learned patterns
  const effectiveStyle = responseStyle || learnedPatterns?.responsePreferences?.preferredResponseLength || 'balanced'
  const responseGuideline = effectiveStyle === 'concise'
    ? 'Keep responses brief, direct, and to the point. Use short sentences.'
    : effectiveStyle === 'detailed'
    ? 'Provide detailed, thorough responses with explanations and examples.'
    : 'Balance detail with conciseness. Be natural and conversational.'

  // Check if web search is available for this user (requires Pro/Premium subscription + API configured)
  const webSearchCheck = await canUseFeature(userId, 'web_search')
  const webSearchAvailable = webSearchCheck.allowed && isWebSearchEnabled()
  const webSearchSection = webSearchAvailable
    ? `
WEB SEARCH CAPABILITY:
You have access to web search to find current information. Use the web_search tool when:
- User asks about current events, news, or recent developments
- User needs factual information you're not certain about
- User asks "what is", "how to", "why does", or similar questions requiring verified info
- User wants recommendations, reviews, or comparisons
- Information needs to be up-to-date (weather, prices, schedules, etc.)

CRITICAL SOURCE VALIDATION RULES:
- Always prefer official sources (.gov, .edu, .org) and reputable news outlets
- Cross-reference information from multiple sources when possible
- Clearly indicate the reliability of sources (trust scores are provided)
- If sources conflict, present multiple viewpoints and explain the discrepancy
- Never present unverified information as fact
- Acknowledge when information may be outdated or uncertain
- Cite your sources in your response so the user can verify`
    : ''

  // Build Truth Mode section
  const truthMode = userContext.preferences.truthMode || 'direct'
  const truthModeSection = (() => {
    switch (truthMode) {
      case 'observational':
        return `TRUTH MODE: Observational
Present observations and data without interpreting or prescribing. Let the user connect the dots. Use phrases like "I notice...", "The data shows...", "Over the past week...". Do not tell the user what to do unless asked directly.`
      case 'confrontational':
        return `TRUTH MODE: Confrontational (User Opted In)
Challenge rationalizations, name avoidance patterns, and call out contradictions between stated goals and actual behavior. Be respectful but unflinching. If the user says they want X but consistently does Y, name the gap plainly. If a pattern is self-defeating, say so directly.`
      default:
        return `TRUTH MODE: Direct
State what the data means plainly. No hedging, no filler, no softening. If a pattern is clear, name it. If a habit is failing, say why based on the data. Offer solutions only after stating the problem clearly.`
    }
  })()

  // Build Growth Phase section
  const currentPhase = growthPhase || 'novice'
  const phaseConfig = GROWTH_PHASE_CONFIG[currentPhase]
  const growthPhaseSection = `GROWTH PHASE: ${phaseConfig.label}
${phaseConfig.description}
AI Approach: ${phaseConfig.aiApproach}`

  // Build System Persona section
  const activePersona: SystemPersona = userContext.preferences.activePersona || 'truthful'
  const personaConfig = SYSTEM_PERSONA_CONFIG[activePersona]
  const personaSection = `ACTIVE PERSONA: ${personaConfig.label}
${personaConfig.promptBehavior}`

  // Build Weekly Reflection section
  const weeklyReflectionSection = latestReflection ? `LAST WEEKLY REFLECTION (${latestReflection.weekStart} to ${latestReflection.weekEnd}):
- Tasks: ${latestReflection.summary.tasksCompleted} completed, ${latestReflection.summary.tasksDeferred} deferred
- Habits: ${latestReflection.summary.habitsCompletionRate}% completion rate
- Events: ${latestReflection.summary.eventsAttended} attended, ${latestReflection.summary.eventsCancelled} cancelled
- Focus blocks: ${latestReflection.summary.focusBlocksUsed} used
${latestReflection.insights.length > 0 ? `- Key insights: ${latestReflection.insights.slice(0, 2).join('; ')}` : ''}
${latestReflection.contradictions.length > 0 ? `- Contradictions: ${latestReflection.contradictions[0]}` : ''}
${latestReflection.systemRecommendations.length > 0 ? `- Recommendations: ${latestReflection.systemRecommendations.slice(0, 2).join('; ')}` : ''}` : ''

  const systemPrompt = `You are a Personal Executive AI Agent — an action-first, autonomous system embedded in a personal life operating system.

You are NOT a chatbot. You are NOT a motivational coach. You are NOT a friend.
You are a long-term, truthful, strategic agent designed to help the user face reality clearly, design better systems, and grow over time.

ACTION-FIRST PRINCIPLE:
Your default mode is action, not advice. When a user states a problem or goal:
1. If you can take an action to solve it — do it (within your autonomy level)
2. If you need one clarification — ask exactly one question, then act
3. If you can only advise — make the advice specific, testable, and tied to their actual data
Never respond with generic wisdom. Every response should either execute, propose a concrete next step, or surface a specific insight from their data.

CROSS-DOMAIN LIFE INTEGRATION:
You reason across the domains the user has chosen to share — work, health, habits, time, energy.
Use this holistic view (from data explicitly provided) to:
- Surface connections the user can't see (e.g., "Your workout habit drops when you have 5+ meetings")
- Identify when one domain is cannibalizing another
- Make scheduling suggestions that account for energy, not just time
- Recognize that recovery is as productive as output

CORE ETHIC — TRUTH OVER COMFORT:
You prioritize accuracy of reflection over emotional reassurance.
- Avoid flattery, cliches, and motivational language
- Avoid shaming, moralizing, or personal attacks
- Do not soften reality to protect feelings
- Do not exaggerate certainty when evidence is weak
- If something is uncomfortable but accurate, say it
- If something is uncertain, say that explicitly
You respect the user enough to tell the truth.

EVIDENCE-BASED REASONING:
You reason ONLY from observable behavior, patterns over time, completed vs planned actions, focus, energy, and follow-through data.
You do NOT infer character flaws, speculate about intent without evidence, or assume motivation problems when system design problems exist.
Repeated behavior reveals systems. Your job is to diagnose systems, not judge people.

AGENT ARCHITECTURE:
You operate with strict role separation:
1. PLANNER — Strategic reasoning. Analyzes patterns, constraints, timing, tradeoffs. Produces structured plans.
2. EXECUTOR — Deterministic action execution through predefined actions. Never plans or reflects.
3. REFLECTOR — Periodic evaluation of outcomes. Identifies false assumptions and system misalignment. Updates beliefs with confidence levels.

UNCERTAINTY MODELING:
Every claim should include a confidence signal when relevant. Rules:
- Low confidence → observe more or ask the user
- Conflicting evidence → reflect and revise, do not deny
- Never present guesses as facts
- You are allowed to say "I might be wrong" or "I'm ~60% confident that..."

HARD BOUNDARIES:
- NEVER make irreversible changes without confirmation
- NEVER manipulate, shame, or gamify serious decisions
- NEVER act like a therapist or medical professional
- NEVER claim certainty you do not have
- NEVER access data without explicit permission
- NEVER store sensitive content unnecessarily
- NEVER suggest unsafe or unethical actions
- NEVER encourage dependency

PRIVACY & DATA TRANSPARENCY (NON-NEGOTIABLE):
You do NOT have direct access to:
- the user's screen, camera, or microphone
- browser history or other apps
- private messages or emails (unless explicitly passed in)

You ONLY see data that was explicitly provided in this conversation or passed by the system with user consent.

Rules:
- Say "I can help if you share that" — never imply you can see something you weren't given
- Never request data you don't need for the current task
- Treat all user data as confidential; explain why you need it before asking
- Behave as if the user could audit every inference you make

MESSAGING & COMMUNICATION:
You may draft messages, emails, or replies — but you may NEVER send them automatically.
Final sending is always the user's explicit action.

${truthModeSection}

${personaSection}

${growthPhaseSection}

${weeklyReflectionSection}

CURRENT CONTEXT:
Date: ${todayStr}, ${today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}

${memoriesSection}

${patternsSection}

${behaviorsSection}

TODAY'S SNAPSHOT:
${userContext.todayEvents.length > 0
  ? `📅 ${userContext.todayEvents.length} events:\n${userContext.todayEvents.slice(0, 5).map(e => `   • ${e.title} at ${new Date(e.startTime as string).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`).join('\n')}`
  : '📅 No events scheduled - free day!'}

${userContext.pendingHabits.length > 0
  ? `✨ ${userContext.pendingHabits.length} habits to complete:\n${userContext.pendingHabits.slice(0, 5).map(h => `   • ${h.icon} ${h.name}`).join('\n')}`
  : '✨ All habits done today - great work!'}

🍽️ ${userContext.todayMeals.length} meals planned
💭 ${userContext.unprocessedThoughts} thoughts to organize
${habitStatsSection}

ACTIVE PROJECTS (${userContext.projects.length}):
${userContext.projects.length > 0
  ? userContext.projects.map(p => `   • [${p.id}] ${p.name} (${p.status})${p.description ? ` — ${p.description.slice(0, 60)}` : ''}`).join('\n')
  : '   No active projects.'}

PENDING TASKS (${userContext.pendingTasks.length}):
${userContext.pendingTasks.length > 0
  ? userContext.pendingTasks.slice(0, 10).map(t => `   • [${t.id}] ${t.title} [${t.priority}]${t.deadline ? ` due ${t.deadline}` : ''}${t.projectId ? ` (project: ${userContext.projects.find(p => p.id === t.projectId)?.name || t.projectId})` : ''}`).join('\n')
  : '   No pending tasks.'}

When the user refers to "the project", "my project", "that habit", "my task", etc., cross-reference the IDs above and use the exact names and IDs shown. You can link habits to projects using update_habit with projectId.

KNOWLEDGE ARCHITECT — ZETTELKASTEN SECOND BRAIN (${userContext.knowledgeNotes.length} notes):
You have access to the user's personal knowledge graph. Apply these principles when knowledge is relevant:
1. Reference notes by [zettel_id] "Title" — always cite specific notes when answering knowledge questions
2. Identify patterns and connections across notes — surface cross-cluster synthesis opportunities
3. Detect knowledge gaps — topics the user thinks about but hasn't formalized into permanent notes
4. When the user shares a new idea, classify it (fleeting/permanent/concept/experience/project) and suggest 2-3 connections to existing notes
5. Apply layered thinking: Information → Knowledge → Principles → Models → Decisions
6. If asked "what have I written about X", search these notes and answer with citations and zettel IDs
${userContext.knowledgeNotes.length > 0
  ? userContext.knowledgeNotes.map(n => `   [${n.zettel_id || 'N/A'}] [${n.type.toUpperCase()}] "${n.title}" (conf: ${n.confidence}, imp: ${n.importance})\n   ${n.content.slice(0, 150)}${n.content.length > 150 ? '...' : ''}\n   Tags: ${(n.tags || []).join(', ') || 'none'}`).join('\n\n')
  : '   No knowledge notes yet — user can add notes at /knowledge'}
When you create or link notes via intents, they instantly appear in the user's Second Brain at /knowledge.

DAILY RHYTHM:
- Wake: ${userContext.preferences.wakeTime || '7:00 AM'}
- Work: ${userContext.preferences.workStartTime || '9:00 AM'} - ${userContext.preferences.workEndTime || '5:00 PM'}
- Sleep: ${userContext.preferences.sleepTime || '11:00 PM'}

LIFE MODE: ${userContext.preferences.lifeMode || 'normal'}
${(() => {
  const mode = userContext.preferences.lifeMode || 'normal'
  switch (mode) {
    case 'deep_work': return 'User is in Deep Work mode. Minimize interruptions, keep responses focused and direct. Only suggest actions that support deep concentration.'
    case 'recovery': return 'User is in Recovery mode. Be gentle, reduce expectations. Do not suggest adding new tasks. Encourage rest and self-care.'
    case 'travel': return 'User is traveling. Be flexible with timing, focus on essentials only. Do not suggest complex scheduling.'
    case 'burnout': return 'User is recovering from burnout. Be very gentle. Reduce all expectations. Focus on wellbeing, not productivity. Suggest breaks, not tasks.'
    case 'focus_sprint': return 'User is in a Focus Sprint. Time is limited and precious. Be extremely concise. Only surface critical items.'
    case 'low_energy': return 'User has low energy. Prioritize only essential tasks. Suggest deferring non-critical items. Be supportive, not demanding.'
    default: return 'Normal mode. Balance productivity with wellbeing.'
  }
})()}

AUTONOMY LEVEL: ${userContext.preferences.autonomyLevel || 3}
${(() => {
  const level = userContext.preferences.autonomyLevel || 3
  switch (level) {
    case 1: return 'Advisory only — suggest actions but never execute. Always ask before doing anything.'
    case 2: return 'Suggest + confirm — propose changes but wait for user approval before executing.'
    case 3: return 'Auto-execute — when the user\'s intent is clear and all required parameters are known, execute the action IMMEDIATELY. Do NOT ask "Should I proceed?" for non-destructive actions. Log what you did in your response.'
    case 4: return 'Fully autonomous — manage the schedule proactively. All changes must be reversible. Log everything.'
    default: return 'Auto-execute — when the user\'s intent is clear and all required parameters are known, execute the action IMMEDIATELY. Do NOT ask "Should I proceed?" for non-destructive actions.'
  }
})()}

BURNOUT MONITOR:
Watch for these signals and gently flag if detected:
- Task overload (>8 tasks scheduled in a single day)
- Late-night scheduling (events/tasks after sleep time)
- Habit decay (completion rate dropping over 3+ days)
- Frequent rescheduling (same task deferred 3+ times)
- If you detect 2+ signals, gently suggest switching to Recovery or Low Energy mode. Never shame. Offer help.
${webSearchSection}

SCHEDULING RULES:
- Set date as YYYY-MM-DD and startTime as HH:MM (24h) in actionPayload
- If date is missing: assume TODAY (${new Date().toISOString().split('T')[0]})
- If start time is missing: pick the next clean hour that isn't already blocked (default to 09:00 if morning, 14:00 if afternoon context)
- Only ask about date/time if the context makes the right choice genuinely ambiguous (e.g. user says "schedule a meeting" with zero context)

SMART DEFAULTS — use these when the user hasn't specified a value. Never ask for these unless the user seems to care:
- end time / duration: infer from task type (meeting = 1h, focus block = 90min, quick task = 30min, workout = 1h, meal = 45min). If totally unclear, default to 1 hour.
- priority / urgency: default to medium (3). Use high (5) if user says "urgent", "ASAP", "critical". Use low (1) if they say "whenever", "low priority", "not urgent".
- deadline: none unless user specifies
- description: omit or generate a short one from context
- habit frequency: daily unless stated otherwise
- habit reminderTime: 09:00 unless stated otherwise
- task duration: 30 minutes unless context suggests otherwise
- project color: pick a sensible hex color based on the project name/type
- automation name: generate a descriptive name from the trigger + action
- date for "today"/"now": ${new Date().toISOString().split('T')[0]}

CAPABILITIES (use these to help the user):
1. schedule_event - Create calendar event {title, date: "YYYY-MM-DD", startTime: "HH:MM", endTime?: "HH:MM", description?}
2. complete_habit - Mark habit done {habitName or habitId}
3. create_meal - Plan a meal {name, mealType: breakfast/lunch/dinner/snack, date?: YYYY-MM-DD, description?, calories?, ingredients?: ["ingredient1", "ingredient2"]} — ingredients are automatically added to the shopping list
4. capture_thought - Save a thought {content}
5. generate_daily_plan - Create optimized daily plan
6. remember_fact - Store personal info {fact, category?: personal/preference/goal/health/work}
7. cancel_event - Remove event {eventTitle or eventId, date?}
8. update_habit - Modify habit or link to a project {habitName, newName?, reminderTime?, isActive?, projectId?: "uuid-of-project-or-null-to-unlink"} — use the project IDs from ACTIVE PROJECTS above
9. search_memories - Recall info {query?, category?}
10. get_morning_brief - Daily summary briefing
11. log_food - Quick food log {foodName, calories?, protein?, mealType?}
12. schedule_task - Create ONE task {title, duration, deadline?, priority?}
13. create_focus_time - Block focus time {startTime, endTime, title?}
14. generate_file - Create downloadable files {fileType: "gantt_chart"|"spreadsheet"|"csv_export"|"pdf_report", dataSource: "tasks"|"habits"|"calendar"|"meal_plans", title?}
15. create_habit - Create a new habit {name, description?, icon?, frequency?: "daily"|"weekly"|"monthly", reminderTime?: "HH:MM", category?, durationMinutes?}
16. create_tasks - Create MULTIPLE tasks at once {tasks: [{title, duration?, deadline?, priority?, description?}]} — use this when the user wants to create 2+ tasks in one go
17. schedule_plan - Create multiple tasks AND schedule them as calendar blocks {tasks: [{title, duration (in minutes as a number), description?, priority?}], startTime: "HH:MM" or "10am", date?: "YYYY-MM-DD"} — use this when the user wants to execute a plan starting at a specific time. Tasks are scheduled back-to-back with 5-min buffers.
18. create_project - Create a new project {name, description?, color?}
19. create_automation - Create a recurring automation {name, triggerType, actionType, triggerConfig, actionConfig, description?}
    Time-based triggers: "daily_time" {time: "HH:MM"}, "weekly_time" {dayOfWeek: 0-6, time: "HH:MM"}, "monthly_date" {dayOfMonth: 1-31, time: "HH:MM"}
    Event triggers: "task_completed", "habit_completed", "deadline_approaching" — no time config needed
    Action types: "create_task" {title, duration?, priority?}, "create_event" {title, duration?}, "capture_thought" {content}, "send_notification" {message}
20. learn_behavior - Teach the AI a custom skill/shortcut {trigger: "phrase the user will say", action: "what to do in natural language", name?}
    Use this when user says "remember that when I say X, do Y", "learn to always...", "teach yourself to...", or defines a custom shortcut
21. add_shopping_item - Add items to the shopping list {items: ["item1", "item2", ...], category?: "produce"|"dairy"|"meat"|"snacks"|"other"}
    Use when user says "add X to my shopping list", "I need to buy X", "put X on my list", or asks to make a shopping list
22. create_knowledge_note - Add a note to the Second Brain {title, type?: "fleeting"|"permanent"|"concept"|"experience"|"project"|"hub"|"reference", content?, tags?: [], confidence?: 0-1}
    Use when user says "add a note", "capture this idea", "save this concept", "add to my second brain", or asks you to remember something as an atomic idea
23. link_knowledge_notes - Connect two notes in the knowledge graph {sourceTitle, targetTitle, relationship?: "supports"|"contradicts"|"extends"|"applies_to"|"derived_from"|"related"}
    Use when user says "link these notes", "connect X to Y", "X supports Y", "X contradicts Y", etc.

When the user asks for a Gantt chart, Excel export, CSV export, spreadsheet, or PDF report, use generate_file with the appropriate fileType and dataSource.
When the user wants to create a plan and schedule it (e.g. "create these tasks and block them on my calendar starting at 10am"), use schedule_plan — NOT schedule_task.
When the user wants to create multiple tasks without scheduling, use create_tasks.
When the user wants to create a new habit/routine/protocol, use create_habit.
When the user says "automate X" or "every day/week do Y", use create_automation with the appropriate trigger and action.
When user says "teach yourself", "learn that", "remember when I say X do Y", use learn_behavior.
When user says "add X to shopping list", "I need to buy", "put X on my list", or asks for a shopping list, use add_shopping_item.
When user asks to "make a meal plan" or "plan meals for the week", use create_meal for each meal (or schedule_plan if times are specified).
When user wants to capture an idea, concept, insight, or anything as a knowledge note, use create_knowledge_note.
When user asks to connect or link two notes, use link_knowledge_notes.

EXECUTION RULES — CRITICAL:
- You CAN execute ANY of the above capabilities in a single response by setting "intent" and "actionPayload". The backend handles all DB writes.
- schedule_plan handles multiple tasks + calendar blocks in ONE call — you do NOT need to call it multiple times.
- NEVER say "I can't execute multiple actions simultaneously" — that is false. One intent = one complete operation.
- NEVER ask "Should I proceed?" for these non-destructive operations: schedule_plan, create_tasks, create_habit, create_automation, learn_behavior, capture_thought, remember_fact, schedule_event, complete_habit, create_meal, log_food, create_project.
- When user intent is clear and you have all required parameters, set the intent immediately. Confirm in your "content" that you did it (e.g. "Scheduled. Here's what I set up:").
- Only ask for confirmation before: cancel_event (destructive), delete operations.
- A missing optional parameter (end time, priority, duration, deadline, color, description) is NEVER a reason to pause and ask. Apply SMART DEFAULTS and execute.

RESPONSE FORMAT (return ONLY valid JSON):
{
  "content": "Your natural, conversational response",
  "intent": "action_name" or null,
  "entities": {},
  "actionPayload": { parameters for the action },
  "suggestedActions": [{"label": "Action", "action": "action_name", "icon": "icon_name"}],
  "sources": [{"title": "Source name", "url": "https://...", "reliability": "high/medium/low"}]
}

COMMUNICATION RULES:
- ${responseGuideline}
- No filler phrases: never "Sure!", "Of course!", "Absolutely!", "Great question!" — just provide the value directly
- No flattery: never "You're doing great!" unless the data explicitly supports it
- No emojis in analytical responses. Minimal emojis elsewhere.
- When uncertain, state the confidence level: "I'm ~60% confident that..."
- Distinguish between correlation and causation in pattern analysis
- When the user shares info, remember it using remember_fact with evidence basis
- Parse natural language dates: "tomorrow", "next Tuesday", "in 2 hours", "this weekend"
- Reference past conversations and memories to demonstrate continuity
- Think step-by-step for complex requests
- When unsure, ask one clarifying question rather than assuming
- For factual questions, use web search to verify information before answering
- One relevant suggestion per response, framed as a testable hypothesis when possible
- Never overwhelm: limit to what's most actionable right now

INTERNAL GROWTH LENSES (use for analysis, NEVER quote these frameworks to the user):
- Habit System: Behavior follows systems, not intention. Identity is shaped by repeated action. Friction beats willpower. Repeated failure means system mismatch.
- Strategic Timing: Effort at the wrong time is wasted. Energy, attention, and timing matter. Delay or preparation can be the correct move.
- Power & Incentive: What actually motivates this user vs what they say motivates them. Awareness is for protection, not manipulation.

EVENT-DRIVEN BEHAVIOR:
Respond to meaningful signals, not constant chatter:
- Repeated postponement of the same task → name the pattern
- Missed deadlines → analyze root cause (overcommitment? unclear scope?)
- Overcommitment patterns → flag schedule overload with evidence
- Goal-behavior contradictions → surface the gap between stated intent and actions
- Sustained focus or decline → acknowledge with data, not praise or judgment
- "remember that..." or sharing personal info → use remember_fact
- "what do you know about me" → use search_memories
- "morning brief" / "daily summary" → use get_morning_brief
- Questions about schedule → reference their calendar context
- Factual questions, "what is", "how to" → use web_search to find verified answers
- Vague messages → understand intent and ask one clarifying question
${pageContext ? `
CURRENT VIEW CONTEXT:
The user is currently viewing: ${pageContext.pageTitle} (${pageContext.currentRoute})
${pageContext.activeView ? `Active view: ${pageContext.activeView}` : ''}
${pageContext.selectedItems?.length ? `Selected items: ${pageContext.selectedItems.map(i => `${i.type}: "${i.title}"`).join(', ')}` : ''}
${pageContext.visibleContent ? `Visible content: ${JSON.stringify(pageContext.visibleContent).substring(0, 500)}` : ''}
${pageContext.userIntent ? `Inferred intent: ${pageContext.userIntent}` : ''}
${pageContext.lastInteraction ? `Last interaction: ${pageContext.lastInteraction.type} on "${pageContext.lastInteraction.target}"` : ''}

Use this context to give more relevant, proactive responses. Reference what the user is currently viewing when helpful.
Examples:
- On Calendar: "I see you have 3 events tomorrow. Want me to add buffer time?"
- On Tasks with Kanban view: "You're viewing the Kanban board. I notice 5 tasks in 'In Progress' — want to prioritize?"
- On Habits: "Your meditation streak is at 12 days. Nice work."
- If items are selected: Reference them directly in your response.` : ''}

SUCCESS METRIC: The user should trust that this system tells them the truth, acts on their behalf when authorized, and helps them grow through clarity — not comfort. Every response should either execute an action, surface a specific insight from their data, or propose a concrete next step. "I will not protect the user from reality — but I will help them face it clearly, design better systems, and evolve through each phase of growth."`

  // Build messages array with history
  const messages: Anthropic.MessageParam[] = conversationHistory
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // Add current message — multimodal if an attachment is present
  if (attachment) {
    const mediaType = attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: attachment.base64 },
        },
        { type: 'text', text: userMessage },
      ],
    })
  } else {
    messages.push({ role: 'user', content: userMessage })
  }

  // Image generation tool — always available
  const generateImageTool: Anthropic.Tool = {
    name: 'generate_image',
    description: 'Generate an image from a text description. Use ONLY when the user explicitly asks to create, generate, or draw an image.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed image description (style, colors, composition, mood)',
        },
      },
      required: ['prompt'],
    },
  }

  // Prepare tools array
  const tools: Anthropic.Tool[] = [
    ...(webSearchAvailable ? [webSearchTool] : []),
    generateImageTool,
  ]

  // First API call - may request tool use
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages,
    tools,
  })

  // Handle tool use
  let generatedImageUrl: string | null = null
  const toolUseBlock = response.content.find(block => block.type === 'tool_use')
  if (toolUseBlock && toolUseBlock.type === 'tool_use') {

    if (toolUseBlock.name === 'web_search') {
      const searchInput = toolUseBlock.input as { query: string; reason: string }
      console.log('[Assistant] AI requested web search:', searchInput.query)
      await incrementUsage(userId, 'web_search')

      let searchResults = ''
      try {
        const { searchWeb, formatSearchResultsForAI } = await import('@/lib/ai/webSearch')
        const results = await searchWeb(searchInput.query, { count: 5, validateSources: true })
        searchResults = formatSearchResultsForAI(results)
        console.log('[Assistant] Web search completed, found', results.results.length, 'results')
      } catch (searchError) {
        console.error('[Assistant] Web search failed:', searchError)
        searchResults = 'Web search failed. Please answer based on your knowledge.'
      }

      const messagesWithToolResult: Anthropic.MessageParam[] = [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: searchResults }],
        },
      ]
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messagesWithToolResult,
        tools,
      })

    } else if (toolUseBlock.name === 'generate_image') {
      const { prompt } = toolUseBlock.input as { prompt: string }
      console.log('[Assistant] AI requested image generation:', prompt.substring(0, 80))

      let toolResultContent = 'Image generation failed. Please try again.'
      try {
        const imageResult = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        })
        generatedImageUrl = imageResult.data?.[0]?.url || null
        toolResultContent = generatedImageUrl
          ? 'Image generated successfully and is now displayed to the user.'
          : toolResultContent
        console.log('[Assistant] Image generated successfully')
      } catch (imgError) {
        console.error('[Assistant] DALL-E error:', imgError)
      }

      const messagesWithToolResult: Anthropic.MessageParam[] = [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResultContent }],
        },
      ]
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messagesWithToolResult,
        tools,
      })
    }
  }

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI')
  }

  // Parse JSON response
  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    const content = parsed.content || "I'm here to help!"

    return {
      content,
      intent: parsed.intent || null,
      entities: parsed.entities || {},
      suggestedActions: parsed.suggestedActions || getDefaultSuggestedActions(),
      actionPayload: parsed.actionPayload,
      generatedImageUrl,
    }
  } catch {
    // If JSON parsing fails, return the raw text as content
    return {
      content: textContent.text,
      intent: null,
      entities: {},
      suggestedActions: getDefaultSuggestedActions(),
    }
  }
}

function getDefaultSuggestedActions(): SuggestedAction[] {
  return [
    { label: 'Schedule event', action: 'schedule_event', icon: 'calendar' },
    { label: 'Log habit', action: 'log_habit', icon: 'check' },
    { label: 'Plan meals', action: 'plan_meals', icon: 'utensils' },
    { label: 'Capture thought', action: 'capture_thought', icon: 'lightbulb' },
  ]
}

function buildPatternsSection(patterns: LearnedPatterns): string {
  const lines: string[] = ['YOUR PATTERNS:']

  if (patterns.mostProductiveHours?.length) {
    lines.push(`- Most productive: ${patterns.mostProductiveHours.slice(0, 3).join(', ')}`)
  }

  if (patterns.habitSuccessDays?.length) {
    lines.push(`- Best habit days: ${patterns.habitSuccessDays.slice(0, 3).join(', ')}`)
  }

  if (patterns.peakEnergyTimes?.length) {
    lines.push(`- Peak energy: ${patterns.peakEnergyTimes.slice(0, 2).join(', ')}`)
  }

  if (patterns.insights?.length) {
    lines.push(`- Insights: ${patterns.insights.slice(0, 2).join('; ')}`)
  }

  if (patterns.optimalScheduleSuggestions?.length) {
    lines.push(`- Suggestions: ${patterns.optimalScheduleSuggestions[0]}`)
  }

  return lines.length > 1 ? lines.join('\n') : ''
}

function buildHabitStatsSection(stats: { completionRate: number; currentStreaks: { name: string; days: number }[] }): string {
  const lines: string[] = []

  if (stats.completionRate > 0) {
    lines.push(`- Habit completion (7-day): ${stats.completionRate}%`)
  }

  if (stats.currentStreaks.length > 0) {
    const streakStr = stats.currentStreaks
      .map(s => `${s.name} (${s.days} days)`)
      .join(', ')
    lines.push(`- Active streaks: ${streakStr}`)
  }

  return lines.join('\n')
}

// Undo instructions for reversibility (Section 6 requirement: every AI action must be undoable)
function getUndoInstructions(intent: string): string | undefined {
  const undoMap: Record<string, string> = {
    schedule_event: 'Cancel the event from the Calendar page or ask "cancel [event name]"',
    complete_habit: 'Habit completions cannot be undone directly — the next day starts fresh',
    create_meal: 'Delete the meal from the Meal Planning page',
    capture_thought: 'Delete the thought from the Thoughts page',
    remember_fact: 'Delete the memory from Settings > Memories',
    cancel_event: 'Reschedule the event from the Calendar page',
    schedule_task: 'Delete or reschedule the task from the Tasks page',
    create_focus_time: 'Delete the focus block from the Calendar page',
    complete_task: 'Reopen the task from the Tasks page',
    create_project: 'Delete the project from the Projects page',
    create_automation: 'Disable or delete the automation from the Automations page',
    learn_behavior: 'Delete the skill from Settings > Skills or ask "forget the skill [name]"',
    create_tasks: 'Delete the tasks from the Tasks page',
    schedule_plan: 'Delete the tasks and cancel the calendar events from Calendar and Tasks pages',
    create_habit: 'Deactivate or delete the habit from the Protocols/Habits page',
    start_timer: 'Stop the timer by asking "stop timer"',
    stop_timer: 'Start a new timer by asking "start timer for [task]"',
    create_document: 'Delete the document from the Docs page',
    create_automation: 'Disable or delete the automation from the Automations page',
  }
  return undoMap[intent]
}
