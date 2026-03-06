import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { TimeEntry, CreateTimeEntryInput } from '@/types/timeTracking'

function transformTimeEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    taskId: row.task_id as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    description: row.description as string | undefined,
    isRunning: (row.is_running as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    taskTitle: row.tasks?.title as string | undefined,
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('time_entries')
    .select('*, tasks(title)')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })

  if (taskId) query = query.eq('task_id', taskId)
  if (startDate) query = query.gte('start_time', startDate)
  if (endDate) query = query.lte('start_time', endDate)

  const { data, error } = await query.limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const entries = (data || []).map((row: Record<string, unknown>) => {
    const entry = transformTimeEntry(row)
    if (row.tasks && typeof row.tasks === 'object') {
      entry.taskTitle = (row.tasks as Record<string, unknown>).title as string
    }
    return entry
  })

  return NextResponse.json({ data: entries })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateTimeEntryInput = await request.json()

  if (!body.taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      task_id: body.taskId,
      start_time: body.startTime || new Date().toISOString(),
      end_time: body.endTime,
      duration_seconds: body.durationSeconds,
      description: body.description,
      is_running: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTimeEntry(data) })
}
