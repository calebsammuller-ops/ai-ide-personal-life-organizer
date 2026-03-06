import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete integration tokens
  await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')

  // Optionally remove imported events
  const { data: googleCalendar } = await supabase
    .from('calendars')
    .select('id')
    .eq('user_id', user.id)
    .eq('external_source', 'google')
    .single()

  if (googleCalendar) {
    await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_id', googleCalendar.id)

    await supabase
      .from('calendars')
      .delete()
      .eq('id', googleCalendar.id)
  }

  return NextResponse.json({ data: { disconnected: true } })
}
