/**
 * Knowledge Service Layer
 * All knowledge graph DB operations go through here.
 * API routes must NOT talk to the DB directly for note CRUD.
 */

import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgeNote, CreateNoteInput, UpdateNoteInput } from '@/types/knowledge'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Transform ──────────────────────────────────────────────────────────────

export function transformNote(n: Record<string, unknown>): KnowledgeNote {
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

// ── Zettelkasten ID ────────────────────────────────────────────────────────

export async function generateZettelId(supabase: SupabaseClient): Promise<string> {
  const base = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
  const suffixes = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  for (const s of suffixes) {
    const id = base + s
    const { data } = await supabase.from('knowledge_notes').select('id').eq('zettel_id', id).maybeSingle()
    if (!data) return id
  }
  return base + Date.now().toString().slice(-4)
}

// ── Embedding ──────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[] | null> {
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

// ── Auto-link trigger ──────────────────────────────────────────────────────

/**
 * Fire-and-forget: triggers the auto-link endpoint for a note.
 * Does NOT block the response — call without await.
 */
export function triggerAutoLink(noteId: string, userId: string): void {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const cronSecret = process.env.CRON_SECRET ?? ''
  fetch(`${baseUrl}/api/knowledge/auto-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal': cronSecret,
    },
    body: JSON.stringify({ noteId, userId }),
  }).catch(() => {
    // Fire-and-forget: silently ignore errors
  })
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function createKnowledgeNote(
  supabase: SupabaseClient,
  userId: string,
  input: CreateNoteInput
): Promise<KnowledgeNote> {
  if (!input.title?.trim()) throw new Error('Title is required')

  const zettelId = await generateZettelId(supabase)
  const embeddingText = `${input.title} ${input.content || ''} ${(input.tags || []).join(' ')}`
  const embedding = await generateEmbedding(embeddingText)

  const insertData: Record<string, unknown> = {
    zettel_id: zettelId,
    user_id: userId,
    title: input.title.trim(),
    type: input.type || 'permanent',
    content: input.content || '',
    tags: input.tags || [],
    confidence: input.confidence ?? 0.8,
    importance: input.importance ?? 0.5,
    source: input.source || 'user',
    source_url: input.sourceUrl,
    is_archived: false,
  }
  if (embedding) insertData.embedding = JSON.stringify(embedding)

  const { data, error } = await supabase
    .from('knowledge_notes')
    .insert(insertData)
    .select()
    .single()

  if (error) throw error

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: userId,
    event_type: 'note_created',
    related_note_ids: [data.id],
    description: `Created ${input.type || 'permanent'} note: "${input.title.trim()}"`,
  }).catch(() => {})

  // Fire-and-forget auto-link
  triggerAutoLink(data.id, userId)

  return transformNote(data)
}

export async function updateKnowledgeNote(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  updates: UpdateNoteInput
): Promise<KnowledgeNote> {
  const updateData: Record<string, unknown> = {}
  if (updates.title !== undefined) updateData.title = updates.title.trim()
  if (updates.content !== undefined) updateData.content = updates.content
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.tags !== undefined) updateData.tags = updates.tags
  if (updates.confidence !== undefined) updateData.confidence = updates.confidence
  if (updates.importance !== undefined) updateData.importance = updates.importance
  if (updates.sourceUrl !== undefined) updateData.source_url = updates.sourceUrl
  if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived

  // Re-generate embedding if content changed
  const contentChanged = updates.title !== undefined || updates.content !== undefined
  if (contentChanged) {
    const { data: existing } = await supabase
      .from('knowledge_notes')
      .select('title, content, tags')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (existing) {
      const embeddingText = [
        updates.title ?? existing.title,
        updates.content ?? existing.content,
        ...(updates.tags ?? existing.tags ?? []),
      ].join(' ')
      const embedding = await generateEmbedding(embeddingText)
      if (embedding) updateData.embedding = JSON.stringify(embedding)
    }
  }

  const { data, error } = await supabase
    .from('knowledge_notes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error

  // Fire-and-forget auto-link if content changed
  if (contentChanged) triggerAutoLink(id, userId)

  return transformNote(data)
}

export async function searchKnowledgeNotes(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 20
): Promise<KnowledgeNote[]> {
  const { data, error } = await supabase
    .from('knowledge_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('importance', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(transformNote)
}
