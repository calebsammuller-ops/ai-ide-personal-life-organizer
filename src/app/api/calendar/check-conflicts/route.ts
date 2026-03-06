import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { detectConflicts, getStartOfDay, getEndOfDay } from '@/lib/calendar/conflictDetection'
import type { CalendarEvent } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { startTime, endTime, excludeEventId, title } = body

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: 'startTime and endTime are required' },
      { status: 400 }
    )
  }

  // Fetch existing events for the same day
  let query = (supabase
    .from('calendar_events') as any)
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', getStartOfDay(startTime))
    .lte('end_time', getEndOfDay(startTime))
    .neq('status', 'cancelled')

  if (excludeEventId) {
    query = query.neq('id', excludeEventId)
  }

  const { data: existingEvents, error } = await query as { data: Record<string, unknown>[] | null; error: Error | null }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform to CalendarEvent type
  const events: CalendarEvent[] = ((existingEvents || []) as any[]).map((e: any) => ({
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

  const conflictInfo = detectConflicts(
    { startTime, endTime, title: title || 'New Event' },
    events
  )

  return NextResponse.json({ data: conflictInfo })
}
