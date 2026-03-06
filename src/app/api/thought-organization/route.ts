import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { validateBody, createThoughtSchema } from '@/lib/validations'
import { processThoughtWithAI } from '@/lib/ai/thoughtProcessor'

// Transform database snake_case to frontend camelCase
function transformThought(thought: Record<string, unknown>) {
  return {
    id: thought.id,
    userId: thought.user_id,
    rawContent: thought.raw_content,
    processedContent: thought.processed_content,
    extractedTasks: thought.extracted_tasks || [],
    extractedEvents: thought.extracted_events || [],
    priority: thought.priority || 3,
    category: thought.category,
    tags: thought.tags || [],
    sentiment: thought.sentiment,
    isProcessed: thought.is_processed || false,
    isArchived: thought.is_archived || false,
    linkedCalendarEventId: thought.linked_calendar_event_id,
    linkedHabitId: thought.linked_habit_id,
    createdAt: thought.created_at,
    updatedAt: thought.updated_at,
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await (supabase
    .from('thoughts') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform all thoughts to camelCase
  const transformedData = ((data || []) as any[]).map(transformThought)

  return NextResponse.json({ data: transformedData })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate request body
  const validation = await validateBody(request, createThoughtSchema)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const body = validation.data

  // Auto-process the thought with AI immediately
  const processed = await processThoughtWithAI(body.rawContent, {
    currentDate: new Date().toISOString().split('T')[0],
  })

  // Insert the thought with AI-processed data
  const { data, error } = await (supabase
    .from('thoughts') as any)
    .insert({
      user_id: user.id,
      raw_content: body.rawContent,
      processed_content: processed.processedContent,
      priority: processed.priority,
      category: processed.category,
      tags: processed.tags,
      extracted_tasks: processed.extractedTasks,
      extracted_events: processed.extractedEvents,
      sentiment: processed.sentiment,
      is_processed: true,
      is_archived: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Failed to create thought' }, { status: 500 })
  }

  // Return transformed data with AI enhancements
  const transformed = transformThought(data)
  return NextResponse.json({
    data: {
      ...transformed,
      aiSummary: processed.aiSummary,
      suggestedActions: processed.suggestedActions,
    }
  })
}
