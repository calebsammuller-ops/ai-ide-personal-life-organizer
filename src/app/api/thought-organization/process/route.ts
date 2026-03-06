import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processThoughtWithAI } from '@/lib/ai/thoughtProcessor'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { thoughtIds } = body

  if (!thoughtIds || !Array.isArray(thoughtIds) || thoughtIds.length === 0) {
    return NextResponse.json({ error: 'thoughtIds array is required' }, { status: 400 })
  }

  // Fetch the thoughts to process
  const { data: thoughts, error: fetchError } = await (supabase
    .from('thoughts') as any)
    .select('*')
    .eq('user_id', user.id)
    .in('id', thoughtIds)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const currentDate = new Date().toISOString().split('T')[0]

  // Process each thought with AI
  const processedThoughts = []
  for (const thought of (thoughts || []) as any[]) {
    try {
      const processed = await processThoughtWithAI(thought.raw_content, {
        currentDate,
      })

      const { data: updated, error: updateError } = await (supabase
        .from('thoughts') as any)
        .update({
          processed_content: processed.processedContent,
          category: processed.category,
          priority: processed.priority,
          tags: processed.tags,
          extracted_tasks: processed.extractedTasks,
          extracted_events: processed.extractedEvents,
          sentiment: processed.sentiment,
          is_processed: true,
        })
        .eq('id', thought.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating thought:', updateError)
        continue
      }

      processedThoughts.push({
        ...updated,
        aiSummary: processed.aiSummary,
        suggestedActions: processed.suggestedActions,
      })
    } catch (error) {
      console.error('Error processing thought:', error)
      continue
    }
  }

  return NextResponse.json({ data: processedThoughts })
}
