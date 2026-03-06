import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateScheduledTasksWithPlan } from '@/lib/scheduling/habitSchedulingIntegration'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface HabitAnalysis {
  summary: string
  whyItMatters: string
  atomicHabitsStrategy: {
    makeItObvious: {
      cue: string
      implementationIntention: string
      habitStacking: string
    }
    makeItAttractive: {
      temptationBundling: string
      motivation: string
    }
    makeItEasy: {
      twoMinuteRule: string
      environmentDesign: string
      reducesFriction: string
    }
    makeItSatisfying: {
      immediateReward: string
      habitTracking: string
    }
  }
  weeklyPlan: {
    day: string
    action: string
    time: string
  }[]
  potentialObstacles: string[]
  tipsForSuccess: string[]
  suggestedReminderTime: string
  generatedAt?: string
  lastModified?: string
}

// GET - Retrieve saved plan for a habit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: habitId } = params

  const { data: habit, error } = await (supabase
    .from('habits') as any)
    .select('plan')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single() as { data: { plan: HabitAnalysis | null } | null; error: Error | null }

  if (error || !habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  if (!habit.plan) {
    return NextResponse.json({ data: null, hasPlan: false })
  }

  return NextResponse.json({ data: habit.plan, hasPlan: true })
}

// POST - Generate new plan (or regenerate)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { id: habitId } = params

  // Check if force regenerate is requested
  let forceRegenerate = false
  try {
    const body = await request.json()
    forceRegenerate = body.forceRegenerate === true
  } catch {
    // No body or invalid JSON, that's fine
  }

  // Get the habit details
  const { data: habit, error: habitError } = await (supabase
    .from('habits') as any)
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single() as { data: Record<string, any> | null; error: Error | null }

  if (habitError || !habit) {
    return NextResponse.json(
      { error: 'Habit not found' },
      { status: 404 }
    )
  }

  // If habit already has a plan and not forcing regenerate, return it
  if (habit.plan && !forceRegenerate) {
    return NextResponse.json({ data: habit.plan, cached: true })
  }

  // Get user preferences for context
  const { data: preferences } = await (supabase
    .from('user_preferences') as any)
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: Record<string, any> | null }

  const userContext = preferences ? `
User's schedule context:
- Wake time: ${preferences.wake_time || '7:00 AM'}
- Sleep time: ${preferences.sleep_time || '11:00 PM'}
- Work hours: ${preferences.work_start_time || '9:00 AM'} to ${preferences.work_end_time || '5:00 PM'}
` : ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a habit coach expert in the principles from James Clear's "Atomic Habits". Analyze this habit and create a comprehensive implementation plan.

HABIT DETAILS:
- Name: ${habit.name}
- Description: ${habit.description || 'No description provided'}
- Frequency: ${habit.frequency}
- Category: ${habit.category || 'General'}
- Target: ${habit.target_count || 1} time(s) per ${habit.frequency === 'daily' ? 'day' : 'week'}
${userContext}

Create a detailed implementation plan using ALL FOUR LAWS from Atomic Habits:
1. Make it Obvious (cue design, implementation intentions, habit stacking)
2. Make it Attractive (temptation bundling, motivation boosting)
3. Make it Easy (2-minute rule, environment design, friction reduction)
4. Make it Satisfying (immediate rewards, habit tracking)

Return a JSON object with this exact structure:
{
  "summary": "Brief 1-2 sentence summary of the habit goal",
  "whyItMatters": "Why this habit is valuable and how it connects to identity",
  "atomicHabitsStrategy": {
    "makeItObvious": {
      "cue": "Specific environmental cue to trigger the habit",
      "implementationIntention": "I will [BEHAVIOR] at [TIME] in [LOCATION]",
      "habitStacking": "After I [CURRENT HABIT], I will [NEW HABIT]"
    },
    "makeItAttractive": {
      "temptationBundling": "Pair with something enjoyable",
      "motivation": "Connect to deeper motivation/identity"
    },
    "makeItEasy": {
      "twoMinuteRule": "Scaled down 2-minute version to start",
      "environmentDesign": "How to prepare environment",
      "reducesFriction": "Remove obstacles and barriers"
    },
    "makeItSatisfying": {
      "immediateReward": "Small reward after completion",
      "habitTracking": "How to track and visualize progress"
    }
  },
  "weeklyPlan": [
    {"day": "Monday", "action": "Specific action", "time": "Suggested time"},
    {"day": "Tuesday", "action": "Specific action", "time": "Suggested time"},
    ... (include all 7 days)
  ],
  "potentialObstacles": ["Obstacle 1", "Obstacle 2", "Obstacle 3"],
  "tipsForSuccess": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"],
  "suggestedReminderTime": "HH:MM (24-hour format)"
}

Be specific and actionable. Tailor advice to this particular habit. Return ONLY the JSON object.`,
        },
      ],
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to analyze habit' },
        { status: 500 }
      )
    }

    let analysis: HabitAnalysis
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      analysis = JSON.parse(jsonMatch[0])
      // Add timestamps
      analysis.generatedAt = new Date().toISOString()
      analysis.lastModified = new Date().toISOString()
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse habit analysis', raw: textContent.text },
        { status: 500 }
      )
    }

    // Save the plan to the habit
    const { error: updateError } = await (supabase
      .from('habits') as any)
      .update({ plan: analysis })
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to save plan:', updateError)
      // Still return the analysis even if save failed
    }

    // Update any existing scheduled tasks with the new plan content
    if (habit.auto_schedule) {
      const updatedHabit = {
        ...habit,
        plan: analysis,
        autoSchedule: habit.auto_schedule,
        durationMinutes: habit.duration_minutes,
        energyLevel: habit.energy_level,
        preferredTimeOfDay: habit.preferred_time_of_day,
        schedulingPriority: habit.scheduling_priority,
      }
      await updateScheduledTasksWithPlan(updatedHabit, user.id, supabase)
    }

    return NextResponse.json({ data: analysis, cached: false })
  } catch (error) {
    console.error('Habit analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze habit' },
      { status: 500 }
    )
  }
}

// PUT - Update/edit the saved plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: habitId } = params
  const body = await request.json()
  const { plan } = body

  if (!plan) {
    return NextResponse.json({ error: 'Plan data required' }, { status: 400 })
  }

  // Update lastModified timestamp
  plan.lastModified = new Date().toISOString()

  const { data, error } = await (supabase
    .from('habits') as any)
    .update({ plan })
    .eq('id', habitId)
    .eq('user_id', user.id)
    .select('plan')
    .single() as { data: { plan: HabitAnalysis } | null; error: Error | null }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data?.plan })
}
