import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { addDays, startOfDay, format } from 'date-fns'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: habitId } = params
  const body = await request.json()
  const { daysAhead = 7 } = body // Default to scheduling 7 days ahead

  // Get the habit details
  const { data: habit, error: habitError } = await (supabase
    .from('habits') as any)
    .select('*')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single() as { data: Record<string, any> | null; error: Error | null }

  if (habitError || !habit) {
    return NextResponse.json(
      { error: 'Habit not found' },
      { status: 404 }
    )
  }

  // Determine the schedule based on frequency
  const events = []
  const today = startOfDay(new Date())
  // Normalize reminder time to HH:MM (DB may store HH:MM:SS)
  const rawTime = habit.reminder_time || '09:00'
  const reminderTime = rawTime.slice(0, 5) // always "HH:MM"

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i)
    const dayOfWeek = date.getDay()

    let shouldSchedule = false

    if (habit.frequency === 'daily') {
      shouldSchedule = true
    } else if (habit.frequency === 'weekly') {
      // For weekly, schedule on the same day of the week as the start date
      const startDay = new Date(habit.start_date).getDay()
      shouldSchedule = dayOfWeek === startDay
    } else if (habit.frequency === 'monthly') {
      // Monthly: same day-of-month as start date
      const startDayOfMonth = new Date(habit.start_date || new Date()).getDate()
      shouldSchedule = date.getDate() === startDayOfMonth
    } else if (habit.frequency === 'custom' && habit.frequency_config?.days) {
      // Custom frequency with specific days
      shouldSchedule = habit.frequency_config.days.includes(dayOfWeek)
    }

    if (shouldSchedule) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const startTime = `${dateStr}T${reminderTime}:00`
      // Compute end time = start + 30 minutes
      const [hh, mm] = reminderTime.split(':').map(Number)
      const endMin = mm + 30
      const endHH = String(hh + Math.floor(endMin / 60)).padStart(2, '0')
      const endMM = String(endMin % 60).padStart(2, '0')
      const endTime = `${dateStr}T${endHH}:${endMM}:00`

      events.push({
        user_id: user.id,
        title: `${habit.icon} ${habit.name}`,
        description: habit.description || `Complete your habit: ${habit.name}`,
        start_time: startTime,
        end_time: endTime,
        all_day: false,
      })
    }
  }

  if (events.length === 0) {
    return NextResponse.json({
      data: { created: 0, message: 'No events to schedule based on habit frequency' }
    })
  }

  // Check for existing scheduled events to avoid duplicates
  const habitTitle = `${habit.icon} ${habit.name}`
  const { data: existing } = await (supabase
    .from('calendar_events') as any)
    .select('start_time')
    .eq('user_id', user.id)
    .eq('title', habitTitle) as { data: { start_time: string }[] | null }

  const existingDateSet = new Set(
    existing?.map(e => e.start_time?.split('T')[0]) || []
  )

  // Filter out events that already exist
  const newEvents = events.filter(
    e => !existingDateSet.has(e.start_time.split('T')[0])
  )

  if (newEvents.length === 0) {
    return NextResponse.json({
      data: { created: 0, message: 'All dates already scheduled' }
    })
  }

  // Insert new events
  const { data: createdEvents, error: insertError } = await (supabase
    .from('calendar_events') as any)
    .insert(newEvents)
    .select()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: {
      created: createdEvents?.length || 0,
      events: createdEvents,
    }
  })
}

// Get scheduled events for a habit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: habitId } = params

  // Get habit to find its title
  const { data: habit } = await (supabase
    .from('habits') as any)
    .select('icon, name')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single() as { data: { icon: string; name: string } | null }

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  const habitTitle = `${habit.icon} ${habit.name}`

  const { data, error } = await (supabase
    .from('calendar_events') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('title', habitTitle)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// Delete scheduled events for a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: habitId } = params

  // Get habit to find its title
  const { data: habit } = await (supabase
    .from('habits') as any)
    .select('icon, name')
    .eq('id', habitId)
    .eq('user_id', user.id)
    .single() as { data: { icon: string; name: string } | null }

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  const habitTitle = `${habit.icon} ${habit.name}`

  const { error } = await (supabase
    .from('calendar_events') as any)
    .delete()
    .eq('user_id', user.id)
    .eq('title', habitTitle)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
