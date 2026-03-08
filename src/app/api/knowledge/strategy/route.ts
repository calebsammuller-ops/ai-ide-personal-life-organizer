import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { buildStrategyPrompt } from '@/lib/ai/prompts/strategy'
import { getCached, setCache } from '@/lib/ai/utils/aiCache'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { StrategyResult } from '@/types/knowledge'
import type { User } from '@supabase/supabase-js'

const FALLBACK: StrategyResult = {
  strategicFocus: 'Build your knowledge base first.',
  steps: [],
  momentumArea: 'Unknown',
  underexploredArea: 'Unknown',
  weeklyChallenge: 'Add 5 new notes this week.',
}

export const GET = withApiHandler(withAuth(async (request: Request, user: User) => {
  const url = new URL(request.url)
  const refresh = url.searchParams.get('refresh') === 'true'

  const supabase = await createClient()

  // Cache check (bypass on refresh=true)
  if (!refresh) {
    const cached = await getCached<StrategyResult>(supabase, user.id, 'strategy')
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }
  }

  // Fetch top 30 notes by importance
  const [{ data: notes }, { data: predictions }, { data: links }] = await Promise.all([
    supabase
      .from('knowledge_notes')
      .select('id, title, type, tags, importance, created_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('importance', { ascending: false })
      .limit(30),
    supabase
      .from('knowledge_predictions')
      .select('description, prediction_type')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .limit(5),
    supabase
      .from('knowledge_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const allNotes = notes || []

  // Compute rising tags from last 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const recentNotes = allNotes.filter(n => n.created_at >= cutoff)
  const recentTagCounts: Record<string, number> = {}
  for (const n of recentNotes) {
    for (const tag of (n.tags || [])) {
      if (tag !== 'ai-insight') {
        recentTagCounts[tag] = (recentTagCounts[tag] || 0) + 1
      }
    }
  }
  const risingTags = Object.entries(recentTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)

  const topNotes = allNotes.map(n => ({
    title: n.title,
    type: n.type,
    tags: n.tags || [],
    importance: n.importance || 0,
  }))

  const prompt = buildStrategyPrompt({
    topNotes,
    risingTags,
    predictions: (predictions || []).map(p => ({
      description: p.description,
      predictionType: p.prediction_type,
    })),
    totalNotes: allNotes.length,
    totalLinks: (links as unknown as { count: number })?.count || 0,
  })

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 900,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  const content = result.success && result.data ? result.data.content : ''
  const data = parseAIJSON<StrategyResult>(content, FALLBACK)

  await setCache(supabase, user.id, 'strategy', data)

  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'insight_generated',
    related_note_ids: [],
    description: 'Strategy plan generated',
  }).catch(() => {})

  return NextResponse.json({ data, cached: false })
}))
