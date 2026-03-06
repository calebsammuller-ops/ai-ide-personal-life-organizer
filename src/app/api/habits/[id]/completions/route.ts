import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabase
    .from('habit_completions')
    .select('*')
    .eq('habit_id', id)
    .eq('user_id', user.id)
    .order('completed_date', { ascending: false })

  if (start) {
    query = query.gte('completed_date', start)
  }
  if (end) {
    query = query.lte('completed_date', end)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const completions = (data || []).map((c) => ({
    id: c.id,
    habitId: c.habit_id,
    userId: c.user_id,
    completedDate: c.completed_date,
    completedCount: c.completed_count,
    notes: c.notes,
    createdAt: c.created_at,
  }))

  return NextResponse.json({ data: completions })
}
