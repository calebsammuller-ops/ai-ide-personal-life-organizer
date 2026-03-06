import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Task, TaskStatus, SchedulingContext, ScheduleItem, BatchScheduleResult } from '@/types/scheduling'
import { batchScheduleTasks } from '@/lib/scheduling/schedulingEngine'

// Transform database task to Task type
function transformTask(task: Record<string, unknown>): Task {
  return {
    id: task.id as string,
    userId: task.user_id as string,
    title: task.title as string,
    description: task.description as string | undefined,
    deadline: task.deadline as string | undefined,
    durationMinutes: task.duration_minutes as number,
    scheduledStart: task.scheduled_start as string | undefined,
    scheduledEnd: task.scheduled_end as string | undefined,
    priority: task.priority as 1 | 2 | 3 | 4 | 5,
    energyLevel: task.energy_level as 'low' | 'medium' | 'high' | undefined,
    category: task.category as string | undefined,
    tags: (task.tags as string[]) || [],
    status: task.status as TaskStatus,
    isAutoScheduled: task.is_auto_scheduled as boolean,
    linkedCalendarEventId: task.linked_calendar_event_id as string | undefined,
    linkedHabitId: task.linked_habit_id as string | undefined,
    rescheduleCount: task.reschedule_count as number,
    completedAt: task.completed_at as string | undefined,
    metadata: task.metadata as Record<string, unknown> | undefined,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { taskIds, options } = body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: 'Task IDs are required' }, { status: 400 })
  }

  // Fetch tasks
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .in('id', taskIds)

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 })
  }

  const tasks = (tasksData || []).map(transformTask)

  // Fetch user preferences
  const { data: prefsData } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const preferences = {
    peakProductivityHours: (prefsData?.peak_productivity_hours as string[]) || ['09:00', '10:00', '11:00', '14:00', '15:00'],
    lowEnergyHours: (prefsData?.low_energy_hours as string[]) || ['13:00', '16:00', '17:00'],
    defaultTaskDuration: (prefsData?.default_task_duration as number) || 30,
    autoScheduleEnabled: true,
    smartRescheduleEnabled: true,
    bufferBetweenTasks: (prefsData?.buffer_between_tasks as number) || 5,
    maxFocusSessionMinutes: 90,
    preferredBreakDuration: 15,
  }

  const dayBoundaries = {
    dayStart: (prefsData?.wake_time as string) || '07:00',
    dayEnd: (prefsData?.sleep_time as string) || '23:00',
    workStart: (prefsData?.work_start_time as string) || '09:00',
    workEnd: (prefsData?.work_end_time as string) || '17:00',
  }

  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  const dayStart = `${today}T00:00:00`
  const dayEnd = `${today}T23:59:59`

  // Fetch existing events for today
  const { data: eventsData } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .neq('status', 'cancelled')

  const events: ScheduleItem[] = (eventsData || []).map((event: Record<string, unknown>) => {
    const startTime = new Date(event.start_time as string)
    const endTime = new Date(event.end_time as string)
    return {
      id: event.id as string,
      type: 'event' as const,
      title: event.title as string,
      startTime: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      endTime: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      priority: event.priority as number,
    }
  })

  // Fetch focus blocks
  const { data: focusBlocksData } = await supabase
    .from('focus_blocks')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const focusBlocks = (focusBlocksData || []).map((fb: Record<string, unknown>) => ({
    id: fb.id as string,
    userId: fb.user_id as string,
    title: fb.title as string,
    startTime: fb.start_time as string,
    endTime: fb.end_time as string,
    daysOfWeek: fb.days_of_week as number[],
    isProtected: fb.is_protected as boolean,
    allowHighPriorityOverride: fb.allow_high_priority_override as boolean,
    bufferMinutes: fb.buffer_minutes as number,
    preferredTaskTypes: (fb.preferred_task_types as string[]) || [],
    blockedCategories: (fb.blocked_categories as string[]) || [],
    isActive: fb.is_active as boolean,
    color: fb.color as string,
    createdAt: fb.created_at as string,
  }))

  // Build scheduling context
  const context: SchedulingContext = {
    date: today,
    events,
    tasks,
    focusBlocks,
    preferences,
    dayBoundaries,
  }

  // Batch schedule tasks
  const result = batchScheduleTasks(tasks, context, {
    respectPriority: options?.respectPriority ?? true,
    optimizeForDeadlines: options?.optimizeForDeadlines ?? true,
    allowRescheduling: options?.allowRescheduling ?? false,
  })

  // Update scheduled tasks in database
  for (const suggestion of result.scheduled) {
    await supabase
      .from('tasks')
      .update({
        scheduled_start: suggestion.proposedStart.toISOString(),
        scheduled_end: suggestion.proposedEnd.toISOString(),
        status: 'scheduled',
      })
      .eq('id', suggestion.taskId)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ data: result })
}
