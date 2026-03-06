/**
 * AI Scheduling Assistant - Claude-powered scheduling decisions
 *
 * Uses Claude AI for complex scheduling decisions, natural language
 * interpretation, and generating scheduling rationale.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  Task,
  SchedulingContext,
  SchedulingSuggestion,
  CreateTaskInput,
  SchedulingPreferences,
} from '@/types/scheduling'
import {
  autoScheduleTask,
  batchScheduleTasks,
  findOptimalSlots,
} from './schedulingEngine'
import {
  dateToTime,
  parseTime,
  timeToString,
} from './slotAnalyzer'

// Initialize Anthropic client
const anthropic = new Anthropic()

// Types for AI responses
interface SchedulingIntent {
  action: 'schedule_task' | 'reschedule' | 'find_time' | 'optimize' | 'create_focus_block' | 'query'
  taskDetails?: CreateTaskInput
  targetDate?: string
  targetTime?: string
  duration?: number
  constraints?: string[]
  query?: string
}

interface OptimizationSuggestion {
  type: 'reorder' | 'consolidate' | 'add_break' | 'move_task' | 'protect_time'
  description: string
  reasoning: string
  impact: 'low' | 'medium' | 'high'
  affectedTasks?: string[]
}

/**
 * Interpret a natural language scheduling request
 */
export async function interpretSchedulingRequest(
  userMessage: string,
  context: {
    currentDate: string
    existingTasks: string[]
    preferences: SchedulingPreferences
  }
): Promise<SchedulingIntent> {
  const systemPrompt = `You are a scheduling assistant that interprets natural language requests about task scheduling.

Current date: ${context.currentDate}
User's existing tasks: ${context.existingTasks.join(', ') || 'None'}
User's peak productivity hours: ${context.preferences.peakProductivityHours.join(', ')}

Parse the user's request and return a JSON object with:
- action: One of 'schedule_task', 'reschedule', 'find_time', 'optimize', 'create_focus_block', 'query'
- taskDetails: If creating a task, include { title, description, deadline, durationMinutes, priority (1-5), energyLevel, category }
- targetDate: ISO date string if mentioned
- targetTime: Time in HH:MM format if mentioned
- duration: Duration in minutes if mentioned
- constraints: Array of any mentioned constraints
- query: If this is a question, the query text

Be smart about interpreting relative dates (tomorrow, next Monday, etc.) and times (morning, afternoon, etc.).
For priority, infer from urgency words: urgent/critical = 1, important = 2, normal = 3, low = 4-5.
For energy level, infer from task type: creative/complex work = high, routine = medium, admin = low.

Return ONLY valid JSON, no markdown or explanation.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: userMessage }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return JSON.parse(content.text) as SchedulingIntent
    }

    throw new Error('Unexpected response format')
  } catch (error) {
    // Fallback parsing
    return fallbackParseRequest(userMessage)
  }
}

/**
 * Fallback parser when AI is unavailable
 */
function fallbackParseRequest(message: string): SchedulingIntent {
  const lowerMessage = message.toLowerCase()

  // Detect action
  let action: SchedulingIntent['action'] = 'query'

  if (lowerMessage.includes('schedule') || lowerMessage.includes('add task') || lowerMessage.includes('create task')) {
    action = 'schedule_task'
  } else if (lowerMessage.includes('reschedule') || lowerMessage.includes('move')) {
    action = 'reschedule'
  } else if (lowerMessage.includes('find time') || lowerMessage.includes('when can')) {
    action = 'find_time'
  } else if (lowerMessage.includes('optimize') || lowerMessage.includes('reorganize')) {
    action = 'optimize'
  } else if (lowerMessage.includes('focus') && (lowerMessage.includes('block') || lowerMessage.includes('time'))) {
    action = 'create_focus_block'
  }

  // Extract duration
  let duration: number | undefined
  const durationMatch = message.match(/(\d+)\s*(hour|hr|minute|min)/i)
  if (durationMatch) {
    const value = parseInt(durationMatch[1])
    const unit = durationMatch[2].toLowerCase()
    duration = unit.startsWith('hour') || unit.startsWith('hr') ? value * 60 : value
  }

  // Extract priority
  let priority: 1 | 2 | 3 | 4 | 5 = 3
  if (lowerMessage.includes('urgent') || lowerMessage.includes('critical') || lowerMessage.includes('asap')) {
    priority = 1
  } else if (lowerMessage.includes('important')) {
    priority = 2
  } else if (lowerMessage.includes('low priority')) {
    priority = 4
  }

  // Extract basic task details if scheduling
  let taskDetails: CreateTaskInput | undefined
  if (action === 'schedule_task') {
    // Try to extract title (text between quotes or after "schedule/add")
    const titleMatch = message.match(/["']([^"']+)["']/) ||
                       message.match(/(?:schedule|add|create)\s+(?:a\s+)?(?:task\s+)?(?:for\s+)?(.+?)(?:\s+for|\s+at|\s+tomorrow|\s+on|$)/i)

    taskDetails = {
      title: titleMatch ? titleMatch[1].trim() : 'New Task',
      durationMinutes: duration || 30,
      priority,
    }
  }

  return {
    action,
    taskDetails,
    duration,
    query: action === 'query' ? message : undefined,
  }
}

/**
 * Get AI-powered optimization suggestions for a schedule
 */
export async function suggestOptimalSchedule(
  tasks: Task[],
  context: SchedulingContext
): Promise<OptimizationSuggestion[]> {
  // Build schedule summary for AI
  const scheduleSummary = tasks.map(t => ({
    title: t.title,
    duration: t.durationMinutes,
    priority: t.priority,
    energyLevel: t.energyLevel,
    deadline: t.deadline,
    scheduled: t.scheduledStart ? `${dateToTime(new Date(t.scheduledStart))} - ${dateToTime(new Date(t.scheduledEnd!))}` : 'Not scheduled',
  }))

  const systemPrompt = `You are a productivity expert analyzing a day's schedule for optimization opportunities.

User's schedule for ${context.date}:
${JSON.stringify(scheduleSummary, null, 2)}

User's peak productivity hours: ${context.preferences.peakProductivityHours.join(', ')}
User's low energy hours: ${context.preferences.lowEnergyHours.join(', ')}

Analyze the schedule and suggest up to 3 optimizations. Consider:
1. Are high-priority tasks scheduled during peak hours?
2. Are tasks grouped efficiently (similar tasks together)?
3. Are there appropriate breaks between focused work?
4. Is there protected time for deep work?
5. Are low-energy tasks during low-energy hours?

Return a JSON array of suggestions:
[{
  "type": "reorder" | "consolidate" | "add_break" | "move_task" | "protect_time",
  "description": "Brief description of the change",
  "reasoning": "Why this improves productivity",
  "impact": "low" | "medium" | "high",
  "affectedTasks": ["task titles affected"]
}]

Return ONLY valid JSON array, no markdown.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        { role: 'user', content: 'Please analyze and optimize this schedule.' }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return JSON.parse(content.text) as OptimizationSuggestion[]
    }

    return []
  } catch (error) {
    // Return basic suggestions without AI
    return generateBasicSuggestions(tasks, context)
  }
}

/**
 * Generate basic suggestions without AI
 */
function generateBasicSuggestions(
  tasks: Task[],
  context: SchedulingContext
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  // Check for high-priority tasks not in productive hours
  const highPriorityTasks = tasks.filter(t => t.priority <= 2 && t.scheduledStart)
  for (const task of highPriorityTasks) {
    const hour = new Date(task.scheduledStart!).getHours()
    const hourStr = `${hour.toString().padStart(2, '0')}:00`

    if (!context.preferences.peakProductivityHours.includes(hourStr)) {
      suggestions.push({
        type: 'move_task',
        description: `Move "${task.title}" to a peak productivity hour`,
        reasoning: 'High-priority tasks are more effective during peak productive hours',
        impact: 'medium',
        affectedTasks: [task.title],
      })
    }
  }

  // Check for long work stretches without breaks
  const scheduledTasks = tasks.filter(t => t.scheduledStart)
  if (scheduledTasks.length >= 4) {
    suggestions.push({
      type: 'add_break',
      description: 'Add short breaks between task clusters',
      reasoning: 'Regular breaks maintain focus and prevent burnout',
      impact: 'medium',
    })
  }

  // Check for focus time
  if (!context.focusBlocks.some(fb => fb.isActive)) {
    suggestions.push({
      type: 'protect_time',
      description: 'Consider adding a focus block for deep work',
      reasoning: 'Protected focus time leads to higher quality output',
      impact: 'high',
    })
  }

  return suggestions.slice(0, 3)
}

/**
 * Generate a human-readable explanation for a scheduling decision
 */
export async function generateSchedulingRationale(
  suggestion: SchedulingSuggestion,
  context: SchedulingContext
): Promise<string> {
  const task = suggestion.task
  const proposedTime = suggestion.proposedStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const systemPrompt = `Generate a brief, friendly explanation (1-2 sentences) for why a task was scheduled at a specific time.

Task: "${task.title}"
Scheduled at: ${proposedTime}
Priority: ${task.priority}/5
${task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
${task.energyLevel ? `Energy level required: ${task.energyLevel}` : ''}

Confidence: ${Math.round(suggestion.confidence * 100)}%

Factors considered:
${suggestion.factors.map(f => `- ${f.name}: ${f.description}`).join('\n')}

Write a natural, conversational explanation. Don't use technical jargon.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        { role: 'user', content: 'Explain this scheduling decision.' }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }

    return buildDefaultRationale(suggestion)
  } catch (error) {
    return buildDefaultRationale(suggestion)
  }
}

/**
 * Build default rationale without AI
 */
function buildDefaultRationale(suggestion: SchedulingSuggestion): string {
  const time = suggestion.proposedStart.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const reasons: string[] = []

  for (const factor of suggestion.factors) {
    if (factor.score >= 0.7) {
      if (factor.name === 'Energy Match') {
        reasons.push('matches your energy level at this time')
      } else if (factor.name === 'Peak Productivity') {
        reasons.push('during your most productive hours')
      } else if (factor.name === 'Deadline Urgency') {
        reasons.push('prioritized due to deadline')
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push('fits well in your schedule')
  }

  return `Scheduled at ${time} because it ${reasons.slice(0, 2).join(' and ')}.`
}

/**
 * Answer questions about the schedule
 */
export async function answerSchedulingQuery(
  query: string,
  context: SchedulingContext
): Promise<string> {
  const scheduleSummary = {
    date: context.date,
    totalTasks: context.tasks.length,
    pendingTasks: context.tasks.filter(t => t.status === 'pending').length,
    scheduledTasks: context.tasks.filter(t => t.status === 'scheduled').length,
    focusBlocks: context.focusBlocks.filter(fb => fb.isActive).length,
    events: context.events.length,
  }

  const systemPrompt = `You are a helpful scheduling assistant. Answer the user's question about their schedule concisely.

Schedule summary for ${context.date}:
${JSON.stringify(scheduleSummary, null, 2)}

Tasks:
${context.tasks.map(t => `- ${t.title} (Priority: ${t.priority}, Status: ${t.status})`).join('\n')}

Be helpful and specific. Keep responses under 100 words.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        { role: 'user', content: query }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }

    return "I couldn't understand that question. Try asking about your tasks, schedule, or availability."
  } catch (error) {
    return "I'm having trouble processing that request. Please try again."
  }
}

/**
 * Get a morning brief summarizing the day's schedule
 */
export async function generateMorningBrief(
  context: SchedulingContext
): Promise<string> {
  const scheduledTasks = context.tasks.filter(t => t.status === 'scheduled')
  const pendingTasks = context.tasks.filter(t => t.status === 'pending')
  const highPriorityCount = context.tasks.filter(t => t.priority <= 2).length
  const focusMinutes = context.focusBlocks
    .filter(fb => fb.isActive && fb.daysOfWeek.includes(new Date(context.date).getDay()))
    .reduce((sum, fb) => {
      const start = parseTime(fb.startTime)
      const end = parseTime(fb.endTime)
      return sum + (end - start)
    }, 0)

  const systemPrompt = `Generate a brief, motivating morning overview of the day's schedule (3-4 sentences max).

Date: ${new Date(context.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
Scheduled tasks: ${scheduledTasks.length}
Pending tasks: ${pendingTasks.length}
High priority items: ${highPriorityCount}
Focus time available: ${Math.round(focusMinutes / 60)} hours
Events: ${context.events.length}

Top 3 tasks:
${context.tasks.slice(0, 3).map(t => `- ${t.title} (P${t.priority})`).join('\n')}

Be encouraging but realistic. Mention key priorities. Keep it brief and actionable.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        { role: 'user', content: 'Give me my morning brief.' }
      ],
      system: systemPrompt,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }

    return buildDefaultMorningBrief(context)
  } catch (error) {
    return buildDefaultMorningBrief(context)
  }
}

/**
 * Build default morning brief without AI
 */
function buildDefaultMorningBrief(context: SchedulingContext): string {
  const scheduledCount = context.tasks.filter(t => t.status === 'scheduled').length
  const highPriority = context.tasks.filter(t => t.priority <= 2)
  const dayName = new Date(context.date).toLocaleDateString('en-US', { weekday: 'long' })

  let brief = `Good morning! You have ${scheduledCount} tasks scheduled for ${dayName}. `

  if (highPriority.length > 0) {
    brief += `Top priority: "${highPriority[0].title}". `
  }

  if (context.focusBlocks.some(fb => fb.isActive)) {
    brief += `You have focus time blocked for deep work. `
  }

  brief += `Let's make it a productive day!`

  return brief
}
