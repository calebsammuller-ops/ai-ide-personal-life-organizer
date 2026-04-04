import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { recordEvolution } from '@/lib/evolution/ideaEvolutionEngine'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type RelationshipType = 'related' | 'supports' | 'extends' | 'contradicts'

async function classifyRelationship(
  sourceTitle: string,
  sourceContent: string,
  targetTitle: string,
  targetContent: string
): Promise<RelationshipType> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `How does idea A relate to idea B? Answer with exactly one word: related, supports, extends, or contradicts.

Idea A: "${sourceTitle}: ${sourceContent.slice(0, 200)}"
Idea B: "${targetTitle}: ${targetContent.slice(0, 200)}"`
      }]
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim().toLowerCase() : 'related'
    if (['related', 'supports', 'extends', 'contradicts'].includes(text)) {
      return text as RelationshipType
    }
    return 'related'
  } catch {
    return 'related'
  }
}

export async function POST(request: NextRequest) {
  // Support both session auth and x-internal server-to-server auth
  const internalHeader = request.headers.get('x-internal')
  const expectedSecret = process.env.CRON_SECRET
  const isInternal = !!expectedSecret && internalHeader === expectedSecret

  const supabase = createClient()
  let userId: string

  if (isInternal) {
    // Server-to-server: accept userId from body
    const body = await request.json()
    const { noteId, userId: bodyUserId, threshold = 0.78 } = body
    if (!noteId || !bodyUserId) {
      return NextResponse.json({ error: 'noteId and userId are required' }, { status: 400 })
    }
    userId = bodyUserId
    return handleAutoLink(supabase as any, userId, noteId, threshold)
  } else {
    // Normal session auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    userId = user.id

    const { noteId, threshold = 0.78 } = await request.json()
    if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
    return handleAutoLink(supabase as any, userId, noteId, threshold)
  }
}

async function handleAutoLink(
  supabase: any,
  userId: string,
  noteId: string,
  threshold: number
): Promise<NextResponse> {
  // Fetch the note to embed
  const { data: note } = await supabase
    .from('knowledge_notes')
    .select('id, title, content, tags, embedding')
    .eq('id', noteId)
    .eq('user_id', userId)
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
      await supabase.from('knowledge_notes').update({
        embedding: JSON.stringify(embedding),
      }).eq('id', noteId)
    } catch {
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
    }
  }

  // Search for similar notes using pgvector
  const { data: similar, error } = await supabase.rpc('match_knowledge_notes', {
    query_embedding: embedding,
    match_user_id: userId,
    match_threshold: threshold,
    match_count: 10,
  })

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
    .eq('user_id', userId)

  const linkedIds = new Set<string>()
  for (const l of (existingLinks || [])) {
    linkedIds.add(l.source_note_id)
    linkedIds.add(l.target_note_id)
  }
  linkedIds.add(noteId)

  const suggestions = (similar || []).filter((s: { id: string }) => !linkedIds.has(s.id))

  // Auto-create high-confidence links with semantic classification
  const autoCreated: string[] = []
  const pending: { id: string; title: string; type: string; similarity: number }[] = []

  for (const match of suggestions as { id: string; title: string; type: string; content: string; similarity: number }[]) {
    if (match.similarity > 0.85) {
      const relationshipType = await classifyRelationship(
        note.title, note.content || '',
        match.title, match.content || ''
      )
      await supabase.from('knowledge_links').insert({
        user_id: userId,
        source_note_id: noteId,
        target_note_id: match.id,
        relationship: 'related',
        relationship_type: relationshipType,
        strength: match.similarity,
      }).catch(() => null)
      autoCreated.push(match.title)
    } else {
      pending.push({ id: match.id, title: match.title, type: match.type, similarity: match.similarity })
    }
  }

  if (autoCreated.length > 0) {
    await supabase.from('cognitive_events').insert({
      user_id: userId,
      event_type: 'link_created',
      related_note_ids: [noteId],
      description: `Auto-linked "${note.title}" to ${autoCreated.length} semantically similar notes: ${autoCreated.join(', ')}`,
    }).catch(() => null)

    // Record connection evolution for the source note
    await recordEvolution(
      supabase,
      userId,
      noteId,
      null,
      'connection',
      `Connected "${note.title}" to: ${autoCreated.slice(0, 3).join(', ')}`
    )
  }

  return NextResponse.json({
    data: { autoCreated, suggestions: pending, noteId }
  })
}
