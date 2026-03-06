import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { detectConflicts, getStartOfDay, getEndOfDay } from '@/lib/calendar/conflictDetection'
import type { CalendarEvent } from '@/types'

// Clean up orphaned calendar events from deleted habits
async function cleanupOrphanedHabitEvents(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  try {
    // Get all active habits to build valid title set
    const { data: habits } = await supabase
      .from('habits')
      .select('icon, name')
      .eq('user_id', userId)
      .eq('is_active', true) as { data: { icon: string; name: string }[] | null; error: Error | null }

    if (!habits) return

    // Build set of valid habit event titles (format: "{icon} {name}")
    const validHabitTitles = new Set(habits.map(h => `${h.icon} ${h.name}`))

    // Get all calendar events that look like habit events (start with emoji)
    // Habit events have titles like "🏋️ Exercise" or "📖 Reading"
    const { data: allEvents } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('user_id', userId) as { data: { id: string; title: string }[] | null; error: Error | null }

    if (!allEvents) return

    // Find orphaned habit events - those with emoji prefix but not matching any valid habit
    // Check if title likely starts with an emoji by looking at first character code point
    const startsWithEmoji = (title: string) => {
      if (!title || title.length === 0) return false
      const codePoint = title.codePointAt(0) || 0
      // Most emojis are above U+1F300, check for common emoji ranges
      return codePoint > 0x1F300 || (codePoint >= 0x2600 && codePoint <= 0x27BF)
    }
    const orphanedEventIds = allEvents
      .filter(event => {
        // Check if title starts with an emoji (likely a habit event)
        if (!startsWithEmoji(event.title)) return false
        // Check if it's NOT in our valid titles set
        return !validHabitTitles.has(event.title)
      })
      .map(event => event.id)

    if (orphanedEventIds.length > 0) {
      await supabase
        .from('calendar_events')
        .delete()
        .in('id', orphanedEventIds)
      console.log(`Cleaned up ${orphanedEventIds.length} orphaned habit calendar events`)
    }
  } catch (error) {
    console.error('Error cleaning up orphaned habit events:', error)
  }
}

// Transform snake_case database fields to camelCase for frontend
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

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Clean up orphaned habit events on calendar fetch
  await cleanupOrphanedHabitEvents(supabase, user.id)

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })

  if (start) {
    query = query.gte('start_time', start)
  }
  if (end) {
    query = query.lte('start_time', `${end}T23:59:59`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform to camelCase
  const transformedData = (data || []).map(transformEvent)

  return NextResponse.json({ data: transformedData })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Get user's primary calendar
  const { data: calendarData } = await supabase
    .from('calendars')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  const calendarId = body.calendarId || (calendarData as { id: string } | null)?.id

  if (!calendarId) {
    return NextResponse.json({ error: 'No calendar found' }, { status: 400 })
  }

  // Check for conflicts unless skipped
  if (!body.skipConflictCheck) {
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', getStartOfDay(body.startTime))
      .lte('end_time', getEndOfDay(body.startTime))
      .neq('status', 'cancelled')

    const events = (existingEvents || []).map(transformEvent)
    const conflictInfo = detectConflicts(
      { startTime: body.startTime, endTime: body.endTime, title: body.title },
      events
    )

    if (conflictInfo.hasConflict) {
      return NextResponse.json({
        conflict: true,
        conflictInfo,
      }, { status: 409 })
    }
  }

  const { data, error } = await (supabase
    .from('calendar_events') as any)
    .insert({
      user_id: user.id,
      calendar_id: calendarId,
      title: body.title,
      description: body.description,
      location: body.location,
      start_time: body.startTime,
      end_time: body.endTime,
      all_day: body.allDay || false,
      status: body.status || 'confirmed',
      priority: body.priority || 3,
      category: body.category,
      reminders: body.reminders || [{ minutes: 15 }],
      is_auto_scheduled: body.isAutoScheduled || false,
      metadata: body.metadata || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformEvent(data) })
}
