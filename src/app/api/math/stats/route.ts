import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: stats, error } = await supabase
      .from('math_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is okay for new users
      throw error
    }

    // If no stats exist yet, return defaults
    if (!stats) {
      return NextResponse.json({
        data: {
          totalProblemsSolved: 0,
          totalCorrect: 0,
          topicsMastered: [],
          weakTopics: [],
          currentStreak: 0,
          bestStreak: 0,
          topicScores: {},
          lastPracticedAt: null,
        },
      })
    }

    return NextResponse.json({
      data: {
        totalProblemsSolved: stats.total_problems_solved ?? 0,
        totalCorrect: stats.total_correct ?? 0,
        topicsMastered: stats.topics_mastered ?? [],
        weakTopics: stats.weak_topics ?? [],
        currentStreak: stats.current_streak ?? 0,
        bestStreak: stats.best_streak ?? 0,
        topicScores: stats.topic_scores ?? {},
        lastPracticedAt: stats.last_practiced_at ?? null,
      },
    })
  } catch (error) {
    console.error('Math stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch math stats' },
      { status: 500 }
    )
  }
}
