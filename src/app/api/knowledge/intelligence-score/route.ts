import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import type { User } from '@supabase/supabase-js'

/**
 * Personal Intelligence Score
 * Formula: (notes × 1) + (links × 2) + (insights × 5) + (evolutions × 3)
 */
export const GET = withApiHandler(withAuth(async (_request: Request, user: User) => {
  const supabase = await createClient()

  const [
    { count: noteCount },
    { count: linkCount },
    { count: insightCount },
    { count: evolutionCount },
  ] = await Promise.all([
    supabase.from('knowledge_notes').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_archived', false),
    supabase.from('knowledge_links').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase.from('knowledge_notes').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_archived', false).contains('tags', ['ai-insight']),
    supabase.from('idea_evolutions').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const notes = noteCount ?? 0
  const links = linkCount ?? 0
  const insights = insightCount ?? 0
  const evolutions = evolutionCount ?? 0

  const score = notes * 1 + links * 2 + insights * 5 + evolutions * 3

  // Week-over-week: count notes created in last 7 days vs previous 7 days
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [{ count: thisWeek }, { count: lastWeek }] = await Promise.all([
    supabase.from('knowledge_notes').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', weekAgo),
    supabase.from('knowledge_notes').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', twoWeeksAgo).lt('created_at', weekAgo),
  ])

  const weekGrowthPct = (lastWeek ?? 0) > 0
    ? Math.round(((thisWeek ?? 0) - (lastWeek ?? 0)) / (lastWeek ?? 1) * 100)
    : null

  return NextResponse.json({
    score,
    breakdown: { notes, links, insights, evolutions },
    weekGrowthPct,
    thisWeekNotes: thisWeek ?? 0,
  })
}))
