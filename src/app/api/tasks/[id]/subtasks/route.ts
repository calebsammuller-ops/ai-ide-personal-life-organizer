import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Task, TaskStatus } from '@/types/scheduling'

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', params.id)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformTask) })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Inherit project_id from parent
  const { data: parent } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', params.id)
    .single()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      parent_task_id: params.id,
      project_id: parent?.project_id,
      title: body.title.trim(),
      description: body.description,
      duration_minutes: body.durationMinutes || 15,
      priority: body.priority || 3,
      energy_level: body.energyLevel,
      tags: [],
      status: 'pending',
      is_auto_scheduled: false,
      reschedule_count: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTask(data) })
}
