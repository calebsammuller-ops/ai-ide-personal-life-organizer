import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { CalendarEvent } from '@/types'

function transformEvent(event: Record<string, unknown>): CalendarEvent {
  return {
    id: event.id as string,
    userId: event.user_id as string,
    calendarId: event.calendar_id as string,
    title: event.title as string,
    description: event.description as string | undefined,
    location: event.location as string | undefined,
    startTime: event.start_time as string,
    endTime: event.end_time as string,
    allDay: event.all_day as boolean,
    recurrenceRule: event.recurrence_rule as string | undefined,
    status: event.status as 'confirmed' | 'tentative' | 'cancelled',
    priority: event.priority as 1 | 2 | 3 | 4 | 5,
    category: event.category as string | undefined,
    reminders: event.reminders as { minutes: number }[],
    isAutoScheduled: event.is_auto_scheduled as boolean,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformEvent(data) })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.location !== undefined) updateData.location = body.location
  if (body.startTime !== undefined) updateData.start_time = body.startTime
  if (body.endTime !== undefined) updateData.end_time = body.endTime
  if (body.allDay !== undefined) updateData.all_day = body.allDay
  if (body.status !== undefined) updateData.status = body.status
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.category !== undefined) updateData.category = body.category
  if (body.reminders !== undefined) updateData.reminders = body.reminders

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformEvent(data) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
