import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Task, TaskStatus, CreateTaskInput } from '@/types/scheduling'

// Transform snake_case database fields to camelCase for frontend
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
    projectId: task.project_id as string | undefined,
    parentTaskId: task.parent_task_id as string | undefined,
    sortOrder: (task.sort_order as number) || 0,
    completionPercentage: (task.completion_percentage as number) || 0,
    isMilestone: (task.is_milestone as boolean) || false,
    metadata: task.metadata as Record<string, unknown> | undefined,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
  }
}

// Export for reuse in subtask/dependency routes
export { transformTask }

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as TaskStatus | null
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const priority = searchParams.get('priority')
  const projectId = searchParams.get('projectId')
  const parentTaskId = searchParams.get('parentTaskId')

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: true })
    .order('deadline', { ascending: true, nullsFirst: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.or(`deadline.gte.${startDate},scheduled_start.gte.${startDate}`)
  }

  if (endDate) {
    query = query.or(`deadline.lte.${endDate},scheduled_end.lte.${endDate}`)
  }

  if (priority) {
    query = query.eq('priority', parseInt(priority))
  }

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (parentTaskId) {
    query = query.eq('parent_task_id', parentTaskId)
  } else if (!searchParams.has('includeSubtasks')) {
    query = query.is('parent_task_id', null)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transformedData = (data || []).map(transformTask)

  return NextResponse.json({ data: transformedData })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateTaskInput = await request.json()

  if (!body.title || body.title.trim() === '') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: body.title.trim(),
      description: body.description,
      deadline: body.deadline,
      duration_minutes: body.durationMinutes || 30,
      priority: body.priority || 3,
      energy_level: body.energyLevel,
      category: body.category,
      tags: body.tags || [],
      status: 'pending',
      is_auto_scheduled: body.isAutoScheduled !== false, // Default to true
      reschedule_count: 0,
      project_id: body.projectId,
      parent_task_id: body.parentTaskId,
      is_milestone: body.isMilestone || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTask(data) })
}
