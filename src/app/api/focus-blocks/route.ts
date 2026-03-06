import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FocusBlock, CreateFocusBlockInput } from '@/types/scheduling'
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

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'

  let query = supabase
    .from('focus_blocks')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transformedData = (data || []).map(transformFocusBlock)

  return NextResponse.json({ data: transformedData })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: CreateFocusBlockInput = await request.json()

  // Validate required fields
  if (!body.startTime || !body.endTime) {
    return NextResponse.json({ error: 'Start time and end time are required' }, { status: 400 })
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(body.startTime) || !timeRegex.test(body.endTime)) {
    return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 })
  }

  // Validate times
  const validation = validateFocusBlockTimes(body.startTime, body.endTime)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Check for overlapping focus blocks
  const { data: existingBlocks } = await supabase
    .from('focus_blocks')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const existingFocusBlocks = (existingBlocks || []).map(transformFocusBlock)
  const overlapping = findOverlappingFocusBlocks(body, existingFocusBlocks)

  if (overlapping.length > 0) {
    return NextResponse.json({
      error: 'Focus block overlaps with existing blocks',
      overlapping: overlapping.map(fb => ({
        id: fb.id,
        title: fb.title,
        startTime: fb.startTime,
        endTime: fb.endTime,
      })),
    }, { status: 409 })
  }

  const { data, error } = await (supabase
    .from('focus_blocks') as any)
    .insert({
      user_id: user.id,
      title: body.title || 'Focus Time',
      start_time: body.startTime,
      end_time: body.endTime,
      days_of_week: body.daysOfWeek || [1, 2, 3, 4, 5], // Default to weekdays
      is_protected: body.isProtected !== false, // Default to true
      allow_high_priority_override: body.allowHighPriorityOverride || false,
      buffer_minutes: body.bufferMinutes || 15,
      preferred_task_types: body.preferredTaskTypes || [],
      blocked_categories: body.blockedCategories || ['meeting', 'call'],
      is_active: true,
      color: body.color || '#6366f1',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: transformFocusBlock(data as any) })
}
