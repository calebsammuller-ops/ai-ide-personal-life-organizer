import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { User } from '@supabase/supabase-js'

const FALLBACK = {
  insight: 'Add more notes to unlock personalized intelligence.',
  whyThisMatters: null,
  pattern: null,
  connections: [],
  nextActions: [{ text: 'Capture your first idea to get started', type: 'expand', priority: 'low', targetId: '' }],
  priority: 'low' as const,
  confidence: 0,
  confidenceReason: null,
  patternShift: null,
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

  // Fetch recent AI insight notes as previous insights context
  const { data: aiInsights } = await supabase
    .from('knowledge_notes')
    .select('title, content')
    .eq('user_id', user.id)
    .eq('type', 'ai-insight')
    .order('created_at', { ascending: false })
    .limit(3)

  const previousInsights = aiInsights && aiInsights.length > 0
    ? (aiInsights as { title: string; content: string }[])
        .map(n => `- ${n.title}: ${(n.content || '').slice(0, 80)}`)
        .join('\n')
    : 'None'

  const summaries = allNotes
    .map((n, i) => `${i + 1}. [${n.type}] "${n.title}" tags:[${(n.tags || []).join(', ')}] — ${(n.content || '').slice(0, 120)}`)
    .join('\n')

  const prompt = `You are an advanced intelligence system acting as a cognitive partner.

You analyze a user's knowledge base to detect thinking patterns, identify meaningful connections, guide decision-making, and recommend high-value actions.

USER NOTES:
${summaries}

PAGE CONTEXT: ${context}

PREVIOUS AI INSIGHTS:
${previousInsights}

YOUR TASK:
1. Identify the strongest thinking pattern
2. Explain why it matters psychologically or strategically
3. Detect 1-2 non-obvious connections between notes
4. Suggest 1-3 prioritized next actions
5. Detect any pattern shift compared to previous insights

RETURN JSON ONLY, no other text:
{
  "insight": "specific observation about thinking direction",
  "whyThisMatters": "why this pattern is important psychologically or strategically",
  "pattern": "repeated behavior or emerging theme",
  "connections": [
    { "noteA": "exact note title", "noteB": "exact note title", "reason": "non-obvious bridge", "strength": 0.0 }
  ],
  "nextActions": [
    { "text": "concrete actionable step", "type": "expand | research | connect", "priority": "high | medium | low", "targetId": "note title or empty string" }
  ],
  "priority": "low | medium | high",
  "confidence": 0.0,
  "confidenceReason": "why this confidence level",
  "patternShift": "how thinking has changed vs previous insights, or null"
}

RULES:
- Be specific, reference actual note titles and content
- Keep each field under 15 words
- Connections must be non-obvious bridges between different domains
- Actions must be immediately actionable
- patternShift is null if no previous insights or no shift detected`

  const result = await sendMessage({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 700,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  if (!result.success || !result.data) {
    return NextResponse.json(FALLBACK)
  }

  const parsed = parseAIJSON(result.data.content, FALLBACK)

  return NextResponse.json({
    insight: parsed.insight || FALLBACK.insight,
    whyThisMatters: parsed.whyThisMatters || null,
    pattern: parsed.pattern || null,
    connections: Array.isArray(parsed.connections) ? parsed.connections.slice(0, 2) : [],
    nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.slice(0, 3) : FALLBACK.nextActions,
    priority: parsed.priority || 'low',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    confidenceReason: parsed.confidenceReason || null,
    patternShift: parsed.patternShift || null,
  })
}))
