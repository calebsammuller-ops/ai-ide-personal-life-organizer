import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import { getCached, setCache } from '@/lib/ai/utils/aiCache'
import type { User } from '@supabase/supabase-js'

const FALLBACK = {
  beliefs: [],
  recurringPatterns: [],
  blindSpots: [],
  strengths: [],
  contradictions: [],
}

export const POST = withApiHandler(withAuth(async (_request: Request, user: User) => {
  const supabase = await createClient()

  const cached = await getCached<typeof FALLBACK>(supabase, user.id, 'cognitive_memory')
  if (cached) return NextResponse.json(cached)

  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, title, tags')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(40)

  type NoteRow = { id: string; title: string; tags: string[] }
  const allNotes: NoteRow[] = (notes as NoteRow[] | null) || []

  if (allNotes.length < 5) return NextResponse.json(FALLBACK)

  const { data: contradictionLinks } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id')
    .eq('user_id', user.id)
    .eq('relationship_type', 'contradicts')
    .limit(10)

  type LinkRow = { source_note_id: string; target_note_id: string }
  const noteMap = Object.fromEntries(allNotes.map(n => [n.id, n.title]))
  const contradictions = ((contradictionLinks as LinkRow[] | null) || [])
    .map(l => `${noteMap[l.source_note_id] || l.source_note_id} ↔ ${noteMap[l.target_note_id] || l.target_note_id}`)
    .join('\n') || 'None found'

  const notesSummary = allNotes
    .map(n => `- "${n.title}" [${(n.tags || []).join(', ')}]`)
    .join('\n')

  const prompt = `Analyze this user's knowledge base and extract their cognitive DNA.

Notes (titles + tags only):
${notesSummary}

Contradicting pairs:
${contradictions}

Return JSON only:
{
  "beliefs": ["2-4 core beliefs visible in their notes"],
  "recurringPatterns": ["2-3 behaviors they repeat"],
  "blindSpots": ["1-2 things they consistently avoid or miss"],
  "strengths": ["2-3 cognitive strengths"],
  "contradictions": [{ "noteA": "title", "noteB": "title" }]
}
Rules: specific, not generic. ≤12 words per item.`

  const result = await sendMessage({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 600,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  if (!result.success || !result.data) return NextResponse.json(FALLBACK)

  const parsed = parseAIJSON(result.data.content, FALLBACK)
  const output = {
    beliefs: Array.isArray(parsed.beliefs) ? parsed.beliefs.slice(0, 4) : [],
    recurringPatterns: Array.isArray(parsed.recurringPatterns) ? parsed.recurringPatterns.slice(0, 3) : [],
    blindSpots: Array.isArray(parsed.blindSpots) ? parsed.blindSpots.slice(0, 2) : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions.slice(0, 5) : [],
  }

  await setCache(supabase, user.id, 'cognitive_memory', output)

  return NextResponse.json(output)
}))
