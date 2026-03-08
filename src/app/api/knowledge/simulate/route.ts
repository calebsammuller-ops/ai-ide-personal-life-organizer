import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { buildWhatIfSystemPrompt } from '@/lib/ai/prompts/simulation'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { WhatIfSimulation } from '@/types/knowledge'
import type { User } from '@supabase/supabase-js'

export const POST = withApiHandler(withAuth(async (request: Request, user: User) => {
  const { question } = await request.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'question required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch top 25 notes by importance
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, content, tags, confidence, importance')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(25)

  const allNotes = (notes || []).map(n => ({
    id: n.id,
    zettelId: n.zettel_id,
    title: n.title,
    type: n.type,
    content: n.content || '',
    tags: n.tags || [],
    confidence: n.confidence,
    importance: n.importance,
  }))

  const systemPrompt = buildWhatIfSystemPrompt(allNotes)

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 1400,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
    userId: user.id,
  })

  const content = result.success && result.data ? result.data.content : ''
  const fallback: WhatIfSimulation = {
    scenario: question,
    outcomes: [],
    recommendation: content || 'Unable to simulate — please try again.',
    notesToReview: [],
  }

  const data = parseAIJSON<WhatIfSimulation>(content, fallback)
  return NextResponse.json({ data })
}))
