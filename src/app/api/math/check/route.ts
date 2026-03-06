import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { problemId, userAnswer, isCorrect, sessionId, timeTakenSeconds } = await request.json()

  // Update problem record if it exists
  if (problemId) {
    await supabase
      .from('math_problems')
      .update({
        is_correct: isCorrect,
        user_answer: userAnswer,
        time_taken_seconds: timeTakenSeconds,
      })
      .eq('id', problemId)
      .eq('user_id', user.id)
  }

  // Update practice session
  if (sessionId) {
    const increment = isCorrect ? 1 : 0
    const { data: current } = await supabase
      .from('math_practice_sessions')
      .select('correct_answers')
      .eq('id', sessionId)
      .single()

    await supabase
      .from('math_practice_sessions')
      .update({
        correct_answers: (current?.correct_answers || 0) + increment,
      })
      .eq('id', sessionId)
  }

  // Update math stats
  const { data: stats } = await supabase
    .from('math_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (stats) {
    await supabase
      .from('math_stats')
      .update({
        total_problems_solved: stats.total_problems_solved + 1,
        total_correct: stats.total_correct + (isCorrect ? 1 : 0),
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('math_stats')
      .insert({
        user_id: user.id,
        total_problems_solved: 1,
        total_correct: isCorrect ? 1 : 0,
        last_practiced_at: new Date().toISOString(),
      })
  }

  return NextResponse.json({ data: { isCorrect, recorded: true } })
}
