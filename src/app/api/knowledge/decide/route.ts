import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { buildDecisionSystemPrompt } from '@/lib/ai/prompts/decision'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { DecisionResult } from '@/types/knowledge'
import type { User } from '@supabase/supabase-js'

export const POST = withApiHandler(withAuth(async (request: Request, user: User) => {
  const { question } = await request.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'question required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch top 20 notes by recency (most relevant context)
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('title, content')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const noteContext = (notes || []).map(n => ({
    title: n.title,
    content: (n.content || '').slice(0, 200),
  }))

  const systemPrompt = buildDecisionSystemPrompt(noteContext)

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 1200,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
    userId: user.id,
  })

  const content = result.success && result.data ? result.data.content : ''
  const fallback: DecisionResult = {
    question,
    options: [],
    recommendation: content || 'Unable to analyze decision — please try again.',
    keyFactors: [],
    blindSpots: [],
    nextStep: '',
  }

  const data = parseAIJSON<DecisionResult>(content, fallback)
  return NextResponse.json({ data })
}))
