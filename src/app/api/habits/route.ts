import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { transformToCamelCase } from '@/lib/transformations'
import { validateBody, createHabitSchema } from '@/lib/validations'
import { scheduleHabitsForDateRange } from '@/lib/scheduling/habitSchedulingIntegration'

// Transform database snake_case to frontend camelCase
function transformHabit(habit: Record<string, unknown>) {
  const transformed = transformToCamelCase(habit)
  // Ensure frequencyConfig has a default value
  if (!transformed.frequencyConfig) {
    transformed.frequencyConfig = {}
  }
  return transformed
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await (supabase
    .from('habits') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transformedData = ((data || []) as any[]).map(transformHabit)
  return NextResponse.json({ data: transformedData })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request body
  const validation = await validateBody(request, createHabitSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const body = validation.data

  const { data, error } = await (supabase
    .from('habits') as any)
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description,
      icon: body.icon ?? '✓',
      color: body.color ?? '#10B981',
      frequency: body.frequency ?? 'daily',
      frequency_config: body.frequencyConfig ?? {},
      target_count: body.targetCount ?? 1,
      reminder_time: body.reminderTime ?? null,
      reminder_enabled: body.reminderEnabled ?? false,
      start_date: body.startDate ?? new Date().toISOString().split('T')[0],
      end_date: body.endDate ?? null,
      category: body.category,
      is_active: true,
      // Scheduling fields
      duration_minutes: body.durationMinutes ?? 15,
      energy_level: body.energyLevel ?? null,
      auto_schedule: body.autoSchedule ?? false,
      preferred_time_of_day: body.preferredTimeOfDay ?? 'anytime',
      scheduling_priority: body.schedulingPriority ?? 3,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
  }

  // If auto-scheduling is enabled, create tasks for the next 7 days
  if (body.autoSchedule) {
    const today = new Date()
    const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    await scheduleHabitsForDateRange(user.id, today, weekLater, supabase)
  }

  return NextResponse.json({ data: transformHabit(data as any) })
}
