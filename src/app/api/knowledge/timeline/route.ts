import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const since = searchParams.get('since')

  let query = supabase
    .from('cognitive_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gte('created_at', since)

  const { data: events, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also get note creation velocity by day (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: notesByDay } = await supabase
    .from('knowledge_notes')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: true })

  // Aggregate by date
  const velocityMap = new Map<string, number>()
  for (const n of (notesByDay || [])) {
    const day = n.created_at.split('T')[0]
    velocityMap.set(day, (velocityMap.get(day) || 0) + 1)
  }

  const velocity = Array.from(velocityMap.entries()).map(([date, count]) => ({ date, count }))

  return NextResponse.json({
    data: {
      events: (events || []).map(e => ({
        id: e.id,
        userId: e.user_id,
        eventType: e.event_type,
        relatedNoteIds: e.related_note_ids || [],
        description: e.description,
        createdAt: e.created_at,
      })),
      velocity,
    }
  })
}
