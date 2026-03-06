import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateDailyPlan, PlanInput } from '@/lib/planning/dailyPlanGenerator'
import type { CalendarEvent, Habit, MealPlan, UserPreferences, TimeBlock } from '@/types'
import type { LearnedPatterns } from '@/state/slices/preferencesSlice'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let date: string
  try {
    const body = await request.json()
    date = body.date || new Date().toISOString().split('T')[0]
  } catch {
    date = new Date().toISOString().split('T')[0]
  }

  // Clean up orphaned habit data (from deleted habits) before generating plan
  await cleanupOrphanedHabitTasks(supabase, user.id)
  await cleanupOrphanedHabitEvents(supabase, user.id)

  const dateStart = `${date}T00:00:00`
  const dateEnd = `${date}T23:59:59`

  // Fetch all required data in parallel
  const [preferencesResult, eventsResult, habitsResult, completionsResult, mealsResult, patternsResult] = await Promise.all([
    (supabase
      .from('user_preferences') as any)
      .select('*')
      .eq('user_id', user.id)
      .single() as Promise<{ data: Record<string, unknown> | null; error: Error | null }>,
    (supabase
      .from('calendar_events') as any)
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', dateStart)
      .lte('start_time', dateEnd)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true }) as Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>,
    (supabase
      .from('habits') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true) as Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>,
    (supabase
      .from('habit_completions') as any)
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('completed_date', date) as Promise<{ data: { habit_id: string }[] | null; error: Error | null }>,
    (supabase
      .from('meal_plans') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date) as Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>,
    (supabase
      .from('user_preferences') as any)
      .select('learned_patterns')
      .eq('user_id', user.id)
      .single() as Promise<{ data: { learned_patterns: unknown } | null; error: Error | null }>,
  ])

  // Filter out already completed habits
  const completedHabitIds = new Set((completionsResult.data || []).map((c: any) => c.habit_id))
  const pendingHabits = ((habitsResult.data || []) as any[]).filter((h: any) => !completedHabitIds.has(h.id))

  // Transform database results to app types with null-safe access
  const prefData = preferencesResult.data as any
  const preferences: Partial<UserPreferences> = prefData ? {
    wakeTime: prefData.wake_time ?? undefined,
    sleepTime: prefData.sleep_time ?? undefined,
    workStartTime: prefData.work_start_time ?? undefined,
    workEndTime: prefData.work_end_time ?? undefined,
    preferredMealTimes: prefData.preferred_meal_times ?? undefined,
  } : {}

  const events: CalendarEvent[] = ((eventsResult.data || []) as any[]).map((e: any) => ({
    id: e.id,
    calendarId: e.calendar_id,
    userId: e.user_id,
    title: e.title,
    description: e.description,
    location: e.location,
    startTime: e.start_time,
    endTime: e.end_time,
    allDay: e.all_day,
    recurrenceRule: e.recurrence_rule,
    status: e.status,
    priority: e.priority,
    category: e.category,
    reminders: e.reminders || [],
    isAutoScheduled: e.is_auto_scheduled,
  }))

  const habits: Habit[] = pendingHabits.map((h: any) => ({
    id: h.id,
    userId: h.user_id,
    name: h.name,
    description: h.description,
    icon: h.icon,
    color: h.color,
    frequency: h.frequency,
    frequencyConfig: h.frequency_config || {},
    targetCount: h.target_count,
    reminderTime: h.reminder_time,
    reminderEnabled: h.reminder_enabled,
    startDate: h.start_date,
    endDate: h.end_date,
    isActive: h.is_active,
    category: h.category,
    plan: h.plan,
  }))

  const meals: MealPlan[] = ((mealsResult.data || []) as any[]).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    date: m.date,
    mealType: m.meal_type,
    name: m.name,
    description: m.description,
    recipeUrl: m.recipe_url,
    calories: m.calories,
    prepTimeMinutes: m.prep_time_minutes,
    cookTimeMinutes: m.cook_time_minutes,
    servings: m.servings,
    ingredients: m.ingredients || [],
    instructions: m.instructions || [],
    nutritionalInfo: m.nutritional_info || {},
    imageUrl: m.image_url,
    tags: m.tags || [],
    isFavorite: m.is_favorite,
  }))

  const learnedPatterns = patternsResult.data?.learned_patterns as LearnedPatterns | null

  // Generate the plan
  const planInput: PlanInput = {
    date,
    preferences,
    events,
    habits,
    meals,
    learnedPatterns,
  }

  const timeBlocks = generateDailyPlan(planInput)

  // Save to database (upsert)
  const { data, error } = await (supabase
    .from('daily_plans') as any)
    .upsert({
      user_id: user.id,
      date,
      plan_data: timeBlocks,
      generated_at: new Date().toISOString(),
      is_locked: false,
    }, {
      onConflict: 'user_id,date',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { date, planData, notes, isLocked } = body

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (planData !== undefined) updates.plan_data = planData
  if (notes !== undefined) updates.notes = notes
  if (isLocked !== undefined) updates.is_locked = isLocked

  const { data, error } = await (supabase
    .from('daily_plans') as any)
    .update(updates)
    .eq('user_id', user.id)
    .eq('date', date)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * Cleans up orphaned habit tasks - tasks linked to habits that no longer exist.
 * This handles the case where habits were deleted before the cascade delete fix.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupOrphanedHabitTasks(supabase: any, userId: string): Promise<void> {
  try {
    // Get all habit-linked tasks for this user
    const { data: habitTasks } = await supabase
      .from('tasks')
      .select('id, category')
      .eq('user_id', userId)
      .like('category', 'habit:%')

    if (!habitTasks || habitTasks.length === 0) return

    // Extract unique habit IDs from task categories
    const habitIds = [...new Set(
      habitTasks
        .map((t: { category: string }) => t.category?.match(/^habit:(.+)$/)?.[1])
        .filter(Boolean)
    )] as string[]

    if (habitIds.length === 0) return

    // Check which habits still exist
    const { data: existingHabits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .in('id', habitIds)

    const existingHabitIds = new Set((existingHabits || []).map((h: { id: string }) => h.id))

    // Find orphaned habit IDs (habits that no longer exist)
    const orphanedHabitIds = habitIds.filter(id => !existingHabitIds.has(id))

    // Delete tasks for orphaned habits
    for (const habitId of orphanedHabitIds) {
      await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .eq('category', `habit:${habitId}`)
    }

    if (orphanedHabitIds.length > 0) {
      console.log(`Cleaned up orphaned tasks from ${orphanedHabitIds.length} deleted habits`)
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned habit tasks:', error)
    // Don't fail the request if cleanup fails
  }
}

/**
 * Cleans up orphaned habit calendar events - events with habit-style titles
 * that don't match any existing habit.
 * Habit events are formatted as "{icon} {habitName}"
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cleanupOrphanedHabitEvents(supabase: any, userId: string): Promise<void> {
  try {
    // Get all habits for this user
    const { data: habits } = await supabase
      .from('habits')
      .select('icon, name')
      .eq('user_id', userId)

    // Create a set of valid habit event titles
    const validHabitTitles = new Set(
      (habits || []).map((h: { icon: string; name: string }) => `${h.icon} ${h.name}`)
    )

    // Get all calendar events for today and future
    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('user_id', userId)
      .gte('start_time', `${today}T00:00:00`)

    if (!events || events.length === 0) return

    // Find events that look like habit events but don't match existing habits
    // Habit events typically start with an emoji
    const orphanedEventIds: string[] = []

    for (const event of events) {
      // Check if this looks like a habit event (starts with emoji followed by space)
      const isHabitEvent = /^[\p{Emoji}]\s/u.test(event.title)

      if (isHabitEvent && !validHabitTitles.has(event.title)) {
        orphanedEventIds.push(event.id)
      }
    }

    // Delete orphaned habit events
    if (orphanedEventIds.length > 0) {
      await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .in('id', orphanedEventIds)

      console.log(`Cleaned up ${orphanedEventIds.length} orphaned habit calendar events`)
    }
  } catch (error) {
    console.error('Failed to cleanup orphaned habit events:', error)
    // Don't fail the request if cleanup fails
  }
}
