import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { getIdeaTimeline } from '@/lib/evolution/ideaEvolutionEngine'
import type { User } from '@supabase/supabase-js'

export const GET = withApiHandler(withAuth(async (request: Request, user: User) => {
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  // /api/knowledge/notes/[id]/evolution → id is 4th segment from end
  const noteId = segments[segments.length - 2]

  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

  const supabase = await createClient()
  const timeline = await getIdeaTimeline(supabase, user.id, noteId)

  return NextResponse.json({ timeline })
}))
