import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TimeEntry } from '@/types/timeTracking'

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
  }
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  const { data: running } = await supabase
    .from('time_entries')
    .select('id, start_time, task_id')
    .eq('user_id', user.id)
    .eq('is_running', true)

  if (!running || running.length === 0) {
    return NextResponse.json({ error: 'No timer running' }, { status: 400 })
  }

  let lastStopped: TimeEntry | null = null
  for (const entry of running) {
    const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000)
    const { data, error } = await supabase
      .from('time_entries')
      .update({ is_running: false, end_time: now, duration_seconds: duration, updated_at: now })
      .eq('id', entry.id)
      .select()
      .single()

    if (!error && data) lastStopped = transformTimeEntry(data as Record<string, unknown>)
  }

  return NextResponse.json({ data: lastStopped })
}
