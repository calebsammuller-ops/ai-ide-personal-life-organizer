import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const taskId: string | null = body.taskId ?? null

  // Stop any currently running timer
  const now = new Date().toISOString()
  const { data: running } = await supabase
    .from('time_entries')
    .select('id, start_time')
    .eq('user_id', user.id)
    .eq('is_running', true)

  if (running && running.length > 0) {
    for (const entry of running) {
      const duration = Math.floor((Date.now() - new Date(entry.start_time).getTime()) / 1000)
      await supabase
        .from('time_entries')
        .update({ is_running: false, end_time: now, duration_seconds: duration, updated_at: now })
        .eq('id', entry.id)
    }
  }

  // Start new timer
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: user.id,
      task_id: taskId,
      start_time: now,
      is_running: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTimeEntry(data as Record<string, unknown>) })
}
