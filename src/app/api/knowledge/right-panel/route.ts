import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { User } from '@supabase/supabase-js'

const CONTEXT_HINTS: Record<string, string> = {
  ideas: 'The user is currently browsing their ideas. Prioritize actions around expanding or connecting ideas.',
  graph: 'The user is viewing their knowledge graph. Emphasize connections and structural patterns.',
  insights: 'The user is on the intelligence hub. Focus on meta-level patterns in their thinking.',
  general: '',
}

const FALLBACK = {
  insight: 'Add more notes to unlock personalized intelligence.',
  connections: [],
  nextAction: { text: 'Capture your first idea to get started', type: 'expand' as const },
  priority: 'low' as const,
  confidence: 0,
}

export const POST = withApiHandler(withAuth(async (request: Request, user: User) => {
  const body = await request.json().catch(() => ({}))
  const context: string = body.context || 'general'

  const supabase = await createClient()

  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, title, type, tags, content')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(25)

  type NoteRow = { id: string; title: string; type: string; tags: string[]; content: string }
  const allNotes: NoteRow[] = (notes as NoteRow[] | null) || []

  if (allNotes.length < 3) {
    return NextResponse.json(FALLBACK)
  }

  const summaries = allNotes
    .map((n, i) => `${i + 1}. [${n.type}] "${n.title}" tags:[${(n.tags || []).join(', ')}] — ${(n.content || '').slice(0, 120)}`)
    .join('\n')

  const contextHint = CONTEXT_HINTS[context] || ''

  const prompt = `You are an intelligence system analyzing a user's thinking patterns.

User's most recent notes:
${summaries}
${contextHint ? `\nContext: ${contextHint}` : ''}

Your job:
1. Detect the strongest pattern in their ideas
2. Identify 1-2 meaningful, non-obvious connections between notes
3. Recommend ONE high-value next action

Return JSON only, no other text:
{
  "insight": "specific observation about their current thinking direction",
  "connections": [
    { "noteA": "exact note title", "noteB": "exact note title", "reason": "why these connect non-obviously", "strength": 0.0-1.0 }
  ],
  "nextAction": {
    "text": "concrete action they should take now",
    "type": "expand | research | connect",
    "targetId": "note title if applicable, else empty string"
  },
  "priority": "low | medium | high",
  "confidence": 0.0-1.0
}

Rules:
- insight must reference their actual ideas, not be generic
- connections must be non-obvious bridges between different domains
- nextAction must be immediately actionable, not vague
- all text fields must be ≤ 15 words`

  const result = await sendMessage({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 500,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  if (!result.success || !result.data) {
    return NextResponse.json(FALLBACK)
  }

  const parsed = parseAIJSON(result.data.content, FALLBACK)

  return NextResponse.json({
    insight: parsed.insight || FALLBACK.insight,
    connections: Array.isArray(parsed.connections) ? parsed.connections.slice(0, 2) : [],
    nextAction: parsed.nextAction || FALLBACK.nextAction,
    priority: parsed.priority || 'low',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  })
}))
