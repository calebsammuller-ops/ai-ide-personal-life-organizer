import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateTaskInput } from '@/types/scheduling'
import { transformTask } from '../route'

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
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTask(data) })
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
  const body: UpdateTaskInput = await request.json()

  // Build update object with snake_case keys
  const updateData: Record<string, unknown> = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.description !== undefined) updateData.description = body.description
  if (body.deadline !== undefined) updateData.deadline = body.deadline
  if (body.durationMinutes !== undefined) updateData.duration_minutes = body.durationMinutes
  if (body.scheduledStart !== undefined) updateData.scheduled_start = body.scheduledStart
  if (body.scheduledEnd !== undefined) updateData.scheduled_end = body.scheduledEnd
  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.energyLevel !== undefined) updateData.energy_level = body.energyLevel
  if (body.category !== undefined) updateData.category = body.category
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.status !== undefined) updateData.status = body.status
  if (body.isAutoScheduled !== undefined) updateData.is_auto_scheduled = body.isAutoScheduled

  // Auto-update status based on scheduling
  if (body.scheduledStart && body.scheduledEnd && !body.status) {
    updateData.status = 'scheduled'
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformTask(data) })
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
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
