import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { buildTrajectoryNarrativePrompt } from '@/lib/ai/prompts/trajectory'
import { getCached, setCache } from '@/lib/ai/utils/aiCache'
import { parseAIJSON } from '@/lib/ai/utils/parseAIJSON'
import type { TrajectoryResult, TrendSeries, TrajectoryNarrative } from '@/types/knowledge'
import type { User } from '@supabase/supabase-js'

export const GET = withApiHandler(withAuth(async (_request: Request, user: User) => {
  const supabase = await createClient()

  const cached = await getCached<TrajectoryResult>(supabase, user.id, 'trajectory')
  if (cached) {
    return NextResponse.json({ data: cached })
  }

  // Fetch notes from last 90 days
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('title, tags, created_at')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .gte('created_at', cutoff90)

  const allNotes = notes || []

  // Aggregate tags by YYYY-MM week approximation
  const tagWeekMap: Record<string, Record<string, number>> = {}
  for (const n of allNotes) {
    const week = n.created_at.slice(0, 7) // YYYY-MM
    for (const tag of (n.tags || [])) {
      if (tag === 'ai-insight') continue
      if (!tagWeekMap[tag]) tagWeekMap[tag] = {}
      tagWeekMap[tag][week] = (tagWeekMap[tag][week] || 0) + 1
    }
  }

  // Compute momentum: count last 30d vs prior 30d
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const momentumMap: Record<string, number> = {}

  for (const n of allNotes) {
    const isRecent = n.created_at >= cutoff30
    const isPrior = n.created_at >= cutoff60 && n.created_at < cutoff30
    for (const tag of (n.tags || [])) {
      if (tag === 'ai-insight') continue
      if (!momentumMap[tag]) momentumMap[tag] = 0
      if (isRecent) momentumMap[tag] += 1
      if (isPrior) momentumMap[tag] -= 0.5
    }
  }

  // Build TrendSeries[]
  const trends: TrendSeries[] = Object.entries(tagWeekMap)
    .map(([tag, weekCounts]) => ({
      tag,
      weeks: Object.entries(weekCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, count]) => ({ week, count })),
      momentum: momentumMap[tag] || 0,
    }))
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 12)

  const risingTags = trends.filter(t => t.momentum > 0).slice(0, 8).map(t => t.tag)
  const stableTags = trends.filter(t => t.momentum === 0).slice(0, 5).map(t => t.tag)
  const recentTitles = allNotes
    .filter(n => n.created_at >= cutoff30)
    .map(n => n.title)
    .slice(0, 15)

  let narrative: TrajectoryNarrative | null = null

  if (risingTags.length > 0 || stableTags.length > 0) {
    const prompt = buildTrajectoryNarrativePrompt(risingTags, stableTags, recentTitles)
    const result = await sendMessage({
      model: 'claude-opus-4-6',
      maxTokens: 500,
      messages: [{ role: 'user', content: prompt }],
      userId: user.id,
    })
    const content = result.success && result.data ? result.data.content : ''
    narrative = parseAIJSON<TrajectoryNarrative>(content, null as unknown as TrajectoryNarrative)
  }

  const data: TrajectoryResult = { trends, risingTags, stableTags, narrative }
  await setCache(supabase, user.id, 'trajectory', data)

  return NextResponse.json({ data })
}))
