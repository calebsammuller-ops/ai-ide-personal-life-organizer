import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Transform database snake_case to frontend camelCase
function transformHabit(habit: Record<string, unknown>) {
  return {
    id: habit.id,
    userId: habit.user_id,
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    frequency: habit.frequency,
    frequencyConfig: habit.frequency_config || {},
    targetCount: habit.target_count,
    reminderTime: habit.reminder_time,
    reminderEnabled: habit.reminder_enabled,
    startDate: habit.start_date,
    endDate: habit.end_date,
    isActive: habit.is_active,
    category: habit.category,
    plan: habit.plan,
    // Scheduling fields
    durationMinutes: habit.duration_minutes,
    energyLevel: habit.energy_level,
    autoSchedule: habit.auto_schedule,
    preferredTimeOfDay: habit.preferred_time_of_day,
    schedulingPriority: habit.scheduling_priority,
    // Project link
    projectId: habit.project_id,
    createdAt: habit.created_at,
    updatedAt: habit.updated_at,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await (supabase
    .from('habits') as any)
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  return NextResponse.json({ data: transformHabit(data as any) })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) updateData.name = body.name
  if (body.description !== undefined) updateData.description = body.description
  if (body.icon !== undefined) updateData.icon = body.icon
  if (body.color !== undefined) updateData.color = body.color
  if (body.frequency !== undefined) updateData.frequency = body.frequency
  if (body.frequencyConfig !== undefined) updateData.frequency_config = body.frequencyConfig
  if (body.targetCount !== undefined) updateData.target_count = body.targetCount
  if (body.reminderTime !== undefined) updateData.reminder_time = body.reminderTime
  if (body.reminderEnabled !== undefined) updateData.reminder_enabled = body.reminderEnabled
  if (body.startDate !== undefined) updateData.start_date = body.startDate
  if (body.endDate !== undefined) updateData.end_date = body.endDate
  if (body.isActive !== undefined) updateData.is_active = body.isActive
  if (body.category !== undefined) updateData.category = body.category
  if (body.plan !== undefined) updateData.plan = body.plan
  if (body.projectId !== undefined) updateData.project_id = body.projectId || null

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await (supabase
    .from('habits') as any)
    .update(updateData)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  return NextResponse.json({ data: transformHabit(data as any) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get habit details first (needed for calendar event title)
  const { data: habit } = await (supabase
    .from('habits') as any)
    .select('icon, name')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single() as { data: { icon: string; name: string } | null }

  // Delete related completions
  await (supabase
    .from('habit_completions') as any)
    .delete()
    .eq('habit_id', params.id)
    .eq('user_id', user.id)

  // Delete all associated tasks (scheduled habit tasks)
  await (supabase
    .from('tasks') as any)
    .delete()
    .eq('user_id', user.id)
    .eq('category', `habit:${params.id}`)

  // Delete associated calendar events (scheduled by /api/habits/[id]/schedule)
  if (habit) {
    const habitTitle = `${habit.icon} ${habit.name}`
    await (supabase
      .from('calendar_events') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('title', habitTitle)
  }

  // Then delete the habit
  const { error } = await (supabase
    .from('habits') as any)
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
