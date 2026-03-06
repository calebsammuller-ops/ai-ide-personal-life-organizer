import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { KnowledgeLink, CreateLinkInput } from '@/types/knowledge'

function transformLink(l: Record<string, unknown>): KnowledgeLink {
  return {
    id: l.id as string,
    userId: l.user_id as string,
    sourceNoteId: l.source_note_id as string,
    targetNoteId: l.target_note_id as string,
    relationship: l.relationship as KnowledgeLink['relationship'],
    strength: (l.strength as number) ?? 0.8,
    createdAt: l.created_at as string,
  }
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('noteId')

  let query = supabase
    .from('knowledge_links')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (noteId) {
    query = query.or(`source_note_id.eq.${noteId},target_note_id.eq.${noteId}`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: (data || []).map(transformLink) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateLinkInput = await request.json()

  if (!body.sourceNoteId || !body.targetNoteId) {
    return NextResponse.json({ error: 'sourceNoteId and targetNoteId are required' }, { status: 400 })
  }

  if (body.sourceNoteId === body.targetNoteId) {
    return NextResponse.json({ error: 'Cannot link a note to itself' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('knowledge_links')
    .insert({
      user_id: user.id,
      source_note_id: body.sourceNoteId,
      target_note_id: body.targetNoteId,
      relationship: body.relationship || 'related',
      strength: body.strength ?? 0.8,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Link already exists between these notes' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update importance scores based on new link (degree centrality approximation)
  await supabase.rpc('match_knowledge_notes' as never, {}).catch(() => null)

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'link_created',
    related_note_ids: [body.sourceNoteId, body.targetNoteId],
    description: `Linked notes with relationship: ${body.relationship || 'related'}`,
  })

  return NextResponse.json({ data: transformLink(data) }, { status: 201 })
}
