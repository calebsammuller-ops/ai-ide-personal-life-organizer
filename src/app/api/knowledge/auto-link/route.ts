import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { noteId, threshold = 0.78 } = await request.json()

  if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

  // Fetch the note to embed
  const { data: note } = await supabase
    .from('knowledge_notes')
    .select('id, title, content, tags, embedding')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

  // Generate or use existing embedding
  let embedding: number[]
  if (note.embedding) {
    embedding = Array.isArray(note.embedding) ? note.embedding : JSON.parse(note.embedding as string)
  } else {
    const embeddingText = `${note.title} ${note.content || ''} ${(note.tags || []).join(' ')}`
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText.slice(0, 8000),
      })
      embedding = response.data[0].embedding
      // Save embedding back
      await supabase.from('knowledge_notes').update({
        embedding: JSON.stringify(embedding),
      }).eq('id', noteId)
    } catch {
      return NextResponse.json({ error: 'Failed to generate embedding. Ensure OpenAI API key is set.' }, { status: 500 })
    }
  }

  // Search for similar notes using pgvector
  const { data: similar, error } = await supabase.rpc('match_knowledge_notes', {
    query_embedding: embedding,
    match_user_id: user.id,
    match_threshold: threshold,
    match_count: 10,
  } as never)

  if (error) {
    return NextResponse.json({
      error: 'Vector search failed. Run: CREATE EXTENSION IF NOT EXISTS vector; in Supabase SQL editor.',
      details: error.message,
    }, { status: 500 })
  }

  // Filter out the note itself and already-linked notes
  const { data: existingLinks } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id')
    .or(`source_note_id.eq.${noteId},target_note_id.eq.${noteId}`)
    .eq('user_id', user.id)

  const linkedIds = new Set<string>()
  for (const l of (existingLinks || [])) {
    linkedIds.add(l.source_note_id)
    linkedIds.add(l.target_note_id)
  }
  linkedIds.add(noteId)

  const suggestions = (similar || []).filter((s: { id: string }) => !linkedIds.has(s.id))

  // Auto-create high-confidence links (similarity > 0.85)
  const autoCreated: string[] = []
  const pending: { id: string; title: string; type: string; similarity: number }[] = []

  for (const match of suggestions as { id: string; title: string; type: string; content: string; similarity: number }[]) {
    if (match.similarity > 0.85) {
      await supabase.from('knowledge_links').insert({
        user_id: user.id,
        source_note_id: noteId,
        target_note_id: match.id,
        relationship: 'related',
        strength: match.similarity,
      }).catch(() => null)
      autoCreated.push(match.title)
    } else {
      pending.push({ id: match.id, title: match.title, type: match.type, similarity: match.similarity })
    }
  }

  if (autoCreated.length > 0) {
    await supabase.from('cognitive_events').insert({
      user_id: user.id,
      event_type: 'link_created',
      related_note_ids: [noteId],
      description: `Auto-linked "${note.title}" to ${autoCreated.length} semantically similar notes: ${autoCreated.join(', ')}`,
    })
  }

  return NextResponse.json({
    data: {
      autoCreated,
      suggestions: pending,
      noteId,
    }
  })
}
