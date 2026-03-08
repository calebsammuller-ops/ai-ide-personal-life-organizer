import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { createKnowledgeNote, transformNote } from '@/lib/knowledge/service'
import type { CreateNoteInput } from '@/types/knowledge'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const archived = searchParams.get('archived') === 'true'
  const search = searchParams.get('search')
  const tag = searchParams.get('tag')
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = supabase
    .from('knowledge_notes')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', archived)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (type && type !== 'all') query = query.eq('type', type)
  if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
  if (tag) query = query.contains('tags', [tag])

  const { data, error } = await query
  if (error) {
    logError(error, { route: 'GET /api/knowledge/notes', userId: user.id })
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }

  return NextResponse.json({ data: (data || []).map(transformNote) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateNoteInput = await request.json()

  try {
    const note = await createKnowledgeNote(supabase as any, user.id, body)
    return NextResponse.json({ data: note }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Title is required') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    logError(error, { route: 'POST /api/knowledge/notes', userId: user.id })
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
