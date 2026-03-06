import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FocusBlock, UpdateFocusBlockInput } from '@/types/scheduling'
import {
  validateFocusBlockTimes,
  findOverlappingFocusBlocks,
} from '@/lib/scheduling/focusBlockManager'

// Transform snake_case database fields to camelCase for frontend
function transformFocusBlock(fb: Record<string, unknown>): FocusBlock {
  return {
    id: fb.id as string,
    userId: fb.user_id as string,
    title: fb.title as string,
    startTime: fb.start_time as string,
    endTime: fb.end_time as string,
    daysOfWeek: fb.days_of_week as number[],
    isProtected: fb.is_protected as boolean,
    allowHighPriorityOverride: fb.allow_high_priority_override as boolean,
    bufferMinutes: fb.buffer_minutes as number,
    preferredTaskTypes: (fb.preferred_task_types as string[]) || [],
    blockedCategories: (fb.blocked_categories as string[]) || [],
    isActive: fb.is_active as boolean,
    color: fb.color as string,
    metadata: fb.metadata as Record<string, unknown> | undefined,
    createdAt: fb.created_at as string,
    updatedAt: fb.updated_at as string | undefined,
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
    .from('focus_blocks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Focus block not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformFocusBlock(data) })
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
  const body: UpdateFocusBlockInput = await request.json()

  // Get current focus block
  const { data: current } = await (supabase
    .from('focus_blocks') as any)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as { data: Record<string, unknown> | null }

  if (!current) {
    return NextResponse.json({ error: 'Focus block not found' }, { status: 404 })
  }

  // Determine final start/end times
  const startTime = body.startTime || (current as any).start_time
  const endTime = body.endTime || (current as any).end_time

  // Validate times if changed
  if (body.startTime || body.endTime) {
    const validation = validateFocusBlockTimes(startTime, endTime)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
  }

  // Check for overlaps if times or days changed
  if (body.startTime || body.endTime || body.daysOfWeek) {
    const { data: existingBlocks } = await supabase
      .from('focus_blocks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .neq('id', id)

    const existingFocusBlocks = (existingBlocks || []).map(transformFocusBlock)
    const updatedBlock = {
      startTime,
      endTime,
      daysOfWeek: body.daysOfWeek || (current as any).days_of_week,
    }

    const overlapping = findOverlappingFocusBlocks(updatedBlock, existingFocusBlocks, id)

    if (overlapping.length > 0) {
      return NextResponse.json({
        error: 'Updated focus block would overlap with existing blocks',
        overlapping: overlapping.map(fb => ({
          id: fb.id,
          title: fb.title,
          startTime: fb.startTime,
          endTime: fb.endTime,
        })),
      }, { status: 409 })
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (body.title !== undefined) updateData.title = body.title
  if (body.startTime !== undefined) updateData.start_time = body.startTime
  if (body.endTime !== undefined) updateData.end_time = body.endTime
  if (body.daysOfWeek !== undefined) updateData.days_of_week = body.daysOfWeek
  if (body.isProtected !== undefined) updateData.is_protected = body.isProtected
  if (body.allowHighPriorityOverride !== undefined) updateData.allow_high_priority_override = body.allowHighPriorityOverride
  if (body.bufferMinutes !== undefined) updateData.buffer_minutes = body.bufferMinutes
  if (body.preferredTaskTypes !== undefined) updateData.preferred_task_types = body.preferredTaskTypes
  if (body.blockedCategories !== undefined) updateData.blocked_categories = body.blockedCategories
  if (body.isActive !== undefined) updateData.is_active = body.isActive
  if (body.color !== undefined) updateData.color = body.color

  const { data, error } = await (supabase
    .from('focus_blocks') as any)
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformFocusBlock(data as any) })
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
    .from('focus_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
