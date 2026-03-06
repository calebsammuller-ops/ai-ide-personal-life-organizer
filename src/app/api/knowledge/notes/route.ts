import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { KnowledgeNote, CreateNoteInput } from '@/types/knowledge'

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

async function generateZettelId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const base = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
  const suffixes = ['', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  for (const s of suffixes) {
    const id = base + s
    const { data } = await supabase.from('knowledge_notes').select('id').eq('zettel_id', id).maybeSingle()
    if (!data) return id
  }
  return base + Date.now().toString().slice(-4)
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: (data || []).map(transformNote) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateNoteInput = await request.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const zettelId = await generateZettelId(supabase)

  // Generate embedding for semantic auto-linking
  const embeddingText = `${body.title} ${body.content || ''} ${(body.tags || []).join(' ')}`
  const embedding = await generateEmbedding(embeddingText)

  const insertData: Record<string, unknown> = {
    zettel_id: zettelId,
    user_id: user.id,
    title: body.title.trim(),
    type: body.type || 'permanent',
    content: body.content || '',
    tags: body.tags || [],
    confidence: body.confidence ?? 0.8,
    importance: body.importance ?? 0.5,
    source: body.source || 'user',
    source_url: body.sourceUrl,
    is_archived: false,
  }

  if (embedding) insertData.embedding = JSON.stringify(embedding)

  const { data, error } = await supabase
    .from('knowledge_notes')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'note_created',
    related_note_ids: [data.id],
    description: `Created ${body.type || 'permanent'} note: "${body.title.trim()}"`,
  })

  return NextResponse.json({ data: transformNote(data) }, { status: 201 })
}
