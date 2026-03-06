import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { KnowledgeNote, UpdateNoteInput } from '@/types/knowledge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function transformNote(n: Record<string, unknown>): KnowledgeNote {
  return {
    id: n.id as string,
    zettelId: n.zettel_id as string | undefined,
    userId: n.user_id as string,
    title: n.title as string,
    type: n.type as KnowledgeNote['type'],
    content: n.content as string,
    tags: (n.tags as string[]) || [],
    confidence: (n.confidence as number) ?? 0.8,
    importance: (n.importance as number) ?? 0.5,
    source: n.source as KnowledgeNote['source'],
    sourceUrl: n.source_url as string | undefined,
    isArchived: n.is_archived as boolean,
    metadata: (n.metadata as Record<string, unknown>) || {},
    createdAt: n.created_at as string,
    updatedAt: n.updated_at as string,
  }
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    })
    return response.data[0].embedding
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('knowledge_notes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: transformNote(data) })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch current note first to save version history
  const { data: current } = await supabase
    .from('knowledge_notes')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body: UpdateNoteInput = await request.json()

  // Save version before updating (only if content or title changed)
  if (
    (body.content !== undefined && body.content !== current.content) ||
    (body.title !== undefined && body.title !== current.title)
  ) {
    await supabase.from('knowledge_note_versions').insert({
      note_id: params.id,
      content: current.content,
      title: current.title,
    })
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) updateData.title = body.title
  if (body.type !== undefined) updateData.type = body.type
  if (body.content !== undefined) updateData.content = body.content
  if (body.tags !== undefined) updateData.tags = body.tags
  if (body.confidence !== undefined) updateData.confidence = body.confidence
  if (body.importance !== undefined) updateData.importance = body.importance
  if (body.isArchived !== undefined) updateData.is_archived = body.isArchived

  // Regenerate embedding if content/title changed
  if (body.content !== undefined || body.title !== undefined) {
    const text = `${body.title ?? current.title} ${body.content ?? current.content} ${(body.tags ?? current.tags ?? []).join(' ')}`
    const embedding = await generateEmbedding(text)
    if (embedding) updateData.embedding = JSON.stringify(embedding)
  }

  const { data, error } = await supabase
    .from('knowledge_notes')
    .update(updateData)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'note_updated',
    related_note_ids: [params.id],
    description: `Updated note: "${data.title}"`,
  })

  return NextResponse.json({ data: transformNote(data) })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('knowledge_notes')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
