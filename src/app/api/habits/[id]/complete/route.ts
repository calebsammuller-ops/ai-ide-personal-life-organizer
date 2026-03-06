import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Transform database snake_case to frontend camelCase
function transformCompletion(completion: Record<string, unknown>) {
  return {
    id: completion.id,
    habitId: completion.habit_id,
    userId: completion.user_id,
    completedDate: completion.completed_date,
    completedCount: completion.completed_count,
    notes: completion.notes,
    createdAt: completion.created_at,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id: habitId } = params
  const { date, count = 1 } = body

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // Check if completion already exists for this date
  const { data: existing } = await (supabase
    .from('habit_completions') as any)
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('completed_date', date)
    .single() as { data: Record<string, unknown> | null }

  if (existing) {
    // Update existing completion
    const { data, error } = await (supabase
      .from('habit_completions') as any)
      .update({ completed_count: count })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: transformCompletion(data as any) })
  }

  // Create new completion
  const { data, error } = await (supabase
    .from('habit_completions') as any)
    .insert({
      habit_id: habitId,
      user_id: user.id,
      completed_date: date,
      completed_count: count,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformCompletion(data as any) })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id: habitId } = params
  const { date } = body

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const { error } = await (supabase
    .from('habit_completions') as any)
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('completed_date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
