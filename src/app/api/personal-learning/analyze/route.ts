import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface LearnedPatterns {
  mostProductiveHours: string[]
  preferredEventDurations: Record<string, number>
  habitSuccessDays: string[]
  commonMealTypes: string[]
  peakEnergyTimes: string[]
  preferredWorkBlocks: { start: string; end: string; avgDuration: number }[]
  habitCorrelations: { habit1: string; habit2: string; correlation: number }[]
  optimalScheduleSuggestions: string[]
  insights: string[]
  analyzedAt: string
}

interface HabitCompletion {
  habit_id: string
  completed_date: string
  completed_count: number
  created_at: string
  habits?: { name: string; category: string }
}

interface CalendarEvent {
  start_time: string
  end_time: string
  category?: string
  title: string
}

interface MealPlan {
  meal_type: string
  date: string
}

interface Thought {
  category?: string
  priority: number
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    )
  }

  // Fetch historical data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDate = thirtyDaysAgo.toISOString()
  const startDateOnly = startDate.split('T')[0]

  const [habitCompletionsResult, calendarEventsResult, mealPlansResult, thoughtsResult] = await Promise.all([
    supabase
      .from('habit_completions')
      .select('*, habits(name, category)')
      .eq('user_id', user.id)
      .gte('completed_date', startDateOnly),
    supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startDate),
    supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDateOnly),
    supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate),
  ])

  const habitCompletions = (habitCompletionsResult.data || []) as HabitCompletion[]
  const calendarEvents = (calendarEventsResult.data || []) as CalendarEvent[]
  const mealPlans = (mealPlansResult.data || []) as MealPlan[]
  const thoughts = (thoughtsResult.data || []) as Thought[]

  // Compute basic statistics
  const statistics = computeStatistics({
    habitCompletions,
    calendarEvents,
    mealPlans,
    thoughts,
  })

  // Use Claude to analyze patterns and generate insights
  let patterns: LearnedPatterns
  try {
    patterns = await analyzeWithClaude(statistics)
  } catch (error) {
    console.error('Claude analysis failed:', error)
    // Return basic computed patterns if AI fails
    patterns = generateBasicPatterns(statistics)
  }

  // Save to user preferences
  const { error: updateError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      learned_patterns: patterns,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (updateError) {
    console.error('Failed to save patterns:', updateError)
  }

  return NextResponse.json({ data: patterns })
}

interface Statistics {
  habitsByDay: Record<string, number>
  habitsByHour: Record<number, number>
  avgEventDurations: Record<string, number>
  eventStartHours: Record<number, number>
  mealTypeCounts: Record<string, number>
  thoughtCategories: Record<string, number>
  thoughtPriorities: Record<number, number>
  totalHabits: number
  totalEvents: number
  totalMeals: number
  totalThoughts: number
  habitNames: string[]
}

function computeStatistics(data: {
  habitCompletions: HabitCompletion[]
  calendarEvents: CalendarEvent[]
  mealPlans: MealPlan[]
  thoughts: Thought[]
}): Statistics {
  const { habitCompletions, calendarEvents, mealPlans, thoughts } = data

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Habit completion by day of week
  const habitsByDay: Record<string, number> = {}
  const habitsByHour: Record<number, number> = {}
  const habitNames: string[] = []

  for (const completion of habitCompletions) {
    const date = new Date(completion.completed_date)
    const dayName = dayNames[date.getDay()]
    habitsByDay[dayName] = (habitsByDay[dayName] || 0) + 1

    if (completion.created_at) {
      const hour = new Date(completion.created_at).getHours()
      habitsByHour[hour] = (habitsByHour[hour] || 0) + 1
    }

    if (completion.habits?.name && !habitNames.includes(completion.habits.name)) {
      habitNames.push(completion.habits.name)
    }
  }

  // Event duration analysis
  const eventDurations: Record<string, number[]> = {}
  const eventStartHours: Record<number, number> = {}

  for (const event of calendarEvents) {
    const category = event.category || 'general'
    const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000

    if (!eventDurations[category]) eventDurations[category] = []
    eventDurations[category].push(duration)

    const hour = new Date(event.start_time).getHours()
    eventStartHours[hour] = (eventStartHours[hour] || 0) + 1
  }

  const avgEventDurations: Record<string, number> = {}
  for (const [category, durations] of Object.entries(eventDurations)) {
    avgEventDurations[category] = Math.round(
      durations.reduce((a, b) => a + b, 0) / durations.length
    )
  }

  // Meal type frequency
  const mealTypeCounts: Record<string, number> = {}
  for (const meal of mealPlans) {
    mealTypeCounts[meal.meal_type] = (mealTypeCounts[meal.meal_type] || 0) + 1
  }

  // Thought categories and priorities
  const thoughtCategories: Record<string, number> = {}
  const thoughtPriorities: Record<number, number> = {}
  for (const thought of thoughts) {
    if (thought.category) {
      thoughtCategories[thought.category] = (thoughtCategories[thought.category] || 0) + 1
    }
    thoughtPriorities[thought.priority] = (thoughtPriorities[thought.priority] || 0) + 1
  }

  return {
    habitsByDay,
    habitsByHour,
    avgEventDurations,
    eventStartHours,
    mealTypeCounts,
    thoughtCategories,
    thoughtPriorities,
    totalHabits: habitCompletions.length,
    totalEvents: calendarEvents.length,
    totalMeals: mealPlans.length,
    totalThoughts: thoughts.length,
    habitNames,
  }
}

async function analyzeWithClaude(statistics: Statistics): Promise<LearnedPatterns> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Analyze this user's life organization data and identify patterns. Provide actionable insights.

DATA:
${JSON.stringify(statistics, null, 2)}

Return a JSON object with this structure:
{
  "mostProductiveHours": ["09:00", "10:00", "14:00"],
  "preferredEventDurations": { "work": 60, "meeting": 30 },
  "habitSuccessDays": ["Monday", "Tuesday"],
  "commonMealTypes": ["breakfast", "dinner"],
  "peakEnergyTimes": ["morning", "early afternoon"],
  "preferredWorkBlocks": [{ "start": "09:00", "end": "12:00", "avgDuration": 180 }],
  "habitCorrelations": [{ "habit1": "exercise", "habit2": "water", "correlation": 0.8 }],
  "optimalScheduleSuggestions": [
    "Schedule important tasks between 9-11 AM based on your habit completion patterns",
    "Your most productive day is Monday - consider scheduling challenging tasks then"
  ],
  "insights": [
    "You complete 40% more habits on weekdays than weekends",
    "Your meal tracking is most consistent for dinner",
    "Consider adding a mid-afternoon break - there's a productivity dip at 3 PM"
  ],
  "analyzedAt": "${new Date().toISOString()}"
}

GUIDELINES:
- Be specific and actionable
- Base insights on the actual data patterns
- If data is limited, acknowledge this and provide what insights you can
- Focus on practical recommendations the user can implement
- Include at least 3 insights and 3 scheduling suggestions

Return ONLY the JSON object.`,
      },
    ],
  })

  const textContent = response.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Failed to analyze patterns')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const patterns = JSON.parse(jsonMatch[0]) as LearnedPatterns
  patterns.analyzedAt = new Date().toISOString()

  return patterns
}

function generateBasicPatterns(statistics: Statistics): LearnedPatterns {
  // Generate basic patterns without AI
  const sortedDays = Object.entries(statistics.habitsByDay)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day)

  const sortedHours = Object.entries(statistics.habitsByHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => `${hour.padStart(2, '0')}:00`)

  const sortedMeals = Object.entries(statistics.mealTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type)

  return {
    mostProductiveHours: sortedHours.length > 0 ? sortedHours : ['09:00', '10:00', '14:00'],
    preferredEventDurations: statistics.avgEventDurations,
    habitSuccessDays: sortedDays.length > 0 ? sortedDays : ['Monday', 'Tuesday', 'Wednesday'],
    commonMealTypes: sortedMeals.length > 0 ? sortedMeals : ['breakfast', 'lunch', 'dinner'],
    peakEnergyTimes: ['morning'],
    preferredWorkBlocks: [{ start: '09:00', end: '12:00', avgDuration: 180 }],
    habitCorrelations: [],
    optimalScheduleSuggestions: [
      'Try to complete your most important habits in the morning',
      'Schedule challenging tasks on your most productive days',
      'Take breaks between focused work sessions',
    ],
    insights: [
      `You have completed ${statistics.totalHabits} habits in the last 30 days`,
      `You have ${statistics.totalEvents} calendar events scheduled`,
      `You have planned ${statistics.totalMeals} meals`,
    ],
    analyzedAt: new Date().toISOString(),
  }
}
