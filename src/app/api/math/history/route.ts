import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: problems, error } = await supabase
      .from('math_problems')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Transform snake_case DB rows to camelCase
    const transformed = (problems || []).map((p) => ({
      id: p.id,
      userId: p.user_id,
      imageUrl: p.image_url ?? undefined,
      problemText: p.problem_text,
      solution: p.solution,
      difficulty: p.difficulty ?? undefined,
      topics: p.topics ?? [],
      source: p.source,
      isCorrect: p.is_correct ?? undefined,
      userAnswer: p.user_answer ?? undefined,
      timeTakenSeconds: p.time_taken_seconds ?? undefined,
      createdAt: p.created_at,
    }))

    return NextResponse.json({ data: transformed })
  } catch (error) {
    console.error('Math history error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch math history' },
      { status: 500 }
    )
  }
}
