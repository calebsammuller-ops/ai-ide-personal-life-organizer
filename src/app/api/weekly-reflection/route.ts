import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyReflection, getLatestReflection } from '@/lib/assistant/weeklyReflection'

/**
 * GET /api/weekly-reflection — Fetch the latest weekly reflection
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reflection = await getLatestReflection(user.id, supabase)

  return NextResponse.json({ data: reflection })
}

/**
 * POST /api/weekly-reflection — Generate a new weekly reflection
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const reflection = await generateWeeklyReflection(
      user.id,
      supabase,
      body.endDate
    )

    return NextResponse.json({ data: reflection })
  } catch (error) {
    console.error('[WeeklyReflection] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate reflection' },
      { status: 500 }
    )
  }
}
