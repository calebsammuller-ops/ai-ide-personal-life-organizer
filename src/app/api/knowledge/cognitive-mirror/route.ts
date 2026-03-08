import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { buildCognitiveMirrorPrompt } from '@/lib/ai/prompts/cognitiveMirror'
import { getCached, setCache } from '@/lib/ai/utils/aiCache'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { CognitiveMirrorResult } from '@/types/knowledge'
import type { User } from '@supabase/supabase-js'

const FALLBACK: CognitiveMirrorResult = {
  patterns: [],
  dominantStyle: 'Explorer',
  observation: 'Not enough data to analyze thinking patterns yet.',
  strengthSummary: 'Keep adding notes to reveal your patterns.',
  blindSpot: 'Unknown — add more notes.',
  recommendation: 'Add at least 10 notes to get your cognitive mirror analysis.',
  thinkingBiases: [],
  learningStyle: 'Analytical',
  focusScore: 0.5,
}

export const GET = withApiHandler(withAuth(async (_request: Request, user: User) => {
  const supabase = await createClient()

  // Cache check
  const cached = await getCached<CognitiveMirrorResult>(supabase, user.id, 'cognitive_mirror')
  if (cached) {
    return NextResponse.json({ data: cached, cached: true })
  }

  // Fetch notes (type + tags only, no content — reduces payload)
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, type, tags, created_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)

  const allNotes = notes || []
  if (allNotes.length < 3) {
    return NextResponse.json({ data: FALLBACK, cached: false })
  }

  // Compute stats in JS
  const notesByType: Record<string, number> = {}
  const tagCounts: Record<string, number> = {}
  let totalTags = 0

  for (const n of allNotes) {
    notesByType[n.type] = (notesByType[n.type] || 0) + 1
    for (const tag of (n.tags || [])) {
      if (tag !== 'ai-insight') {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
        totalTags++
      }
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }))

  const avgTagsPerNote = allNotes.length > 0 ? totalTags / allNotes.length : 0

  // Fetch evolution counts by type
  const { data: evolutions } = await supabase
    .from('idea_evolutions')
    .select('evolution_type')
    .eq('user_id', user.id)

  const evoList = evolutions || []
  const expansionCount = evoList.filter(e => e.evolution_type === 'expansion').length
  const connectionCount = evoList.filter(e => e.evolution_type === 'connection').length
  const insightCount = evoList.filter(e => e.evolution_type === 'insight').length

  const prompt = buildCognitiveMirrorPrompt({
    notesByType,
    topTags,
    expansionCount,
    connectionCount,
    insightCount,
    totalNotes: allNotes.length,
    avgTagsPerNote,
  })

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 700,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  const content = result.success && result.data ? result.data.content : ''
  const data = parseAIJSON<CognitiveMirrorResult>(content, FALLBACK)

  await setCache(supabase, user.id, 'cognitive_mirror', data)

  // Log analytics event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'insight_generated',
    related_note_ids: [],
    description: 'Cognitive mirror analysis generated',
  }).catch(() => {})

  return NextResponse.json({ data, cached: false })
}))
