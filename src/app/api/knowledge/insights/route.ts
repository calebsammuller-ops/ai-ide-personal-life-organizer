import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { noteId } = await request.json().catch(() => ({}))

  // Fetch all non-archived notes
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, content, tags, confidence, importance')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(100)

  const { data: links } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id, relationship, strength')
    .eq('user_id', user.id)

  if (!notes || notes.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 notes to generate insights' }, { status: 400 })
  }

  const formattedNotes = notes.map(n =>
    `[${n.zettel_id || n.id.slice(0, 8)}] [${n.type.toUpperCase()}] "${n.title}" (confidence: ${n.confidence}, importance: ${n.importance})\nContent: ${n.content?.slice(0, 300) || '(empty)'}\nTags: ${(n.tags || []).join(', ')}`
  ).join('\n\n')

  const formattedLinks = (links || []).map(l => {
    const src = notes.find(n => n.id === l.source_note_id)
    const tgt = notes.find(n => n.id === l.target_note_id)
    return src && tgt ? `"${src.title}" --[${l.relationship}]--> "${tgt.title}"` : null
  }).filter(Boolean).join('\n')

  const focusNote = noteId ? notes.find(n => n.id === noteId) : null

  const prompt = `You are analyzing a Zettelkasten knowledge graph with ${notes.length} notes.

NOTES:
${formattedNotes}

EXISTING LINKS:
${formattedLinks || 'None yet'}

${focusNote ? `FOCUS NOTE: "${focusNote.title}" — prioritize connections to this note.` : ''}

TASK: Generate high-value knowledge synthesis. Think deeply about non-obvious connections.

Generate:
1. Up to 5 NEW permanent or insight notes that synthesize cross-cluster ideas (each must be genuinely novel, not a repeat of existing notes)
2. Hub notes if 5+ notes share a theme (name the hub clearly, mark type:"hub")
3. Up to 10 new suggested links between notes NOT yet connected (look for hidden relationships)
4. Flag any contradictions between existing notes
5. Identify the top emerging cluster themes

Return ONLY valid JSON:
{
  "newNotes": [{"title": string, "type": "permanent"|"hub"|"concept", "content": string, "tags": string[], "confidence": number, "source": "AI"}],
  "newLinks": [{"sourceTitle": string, "targetTitle": string, "relationship": "supports"|"contradicts"|"extends"|"applies_to"|"derived_from"|"related", "strength": number}],
  "contradictions": [{"noteA": string, "noteB": string, "description": string}],
  "clusterThemes": string[],
  "summary": string
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: {
    newNotes: { title: string; type: string; content: string; tags: string[]; confidence: number; source: string }[]
    newLinks: { sourceTitle: string; targetTitle: string; relationship: string; strength: number }[]
    contradictions: { noteA: string; noteB: string; description: string }[]
    clusterThemes: string[]
    summary: string
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  const createdNotes: string[] = []

  // Insert new AI notes
  for (const note of (aiResult.newNotes || [])) {
    const zettelBase = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
    const zettelId = zettelBase + '_ai_' + Math.random().toString(36).slice(2, 6)

    const { data: inserted } = await supabase.from('knowledge_notes').insert({
      zettel_id: zettelId,
      user_id: user.id,
      title: note.title,
      type: note.type || 'permanent',
      content: note.content,
      tags: note.tags || [],
      confidence: note.confidence || 0.7,
      importance: 0.6,
      source: 'AI',
      is_archived: false,
    }).select().single()

    if (inserted) createdNotes.push(inserted.id)
  }

  // Insert new links
  const createdLinks: string[] = []
  for (const link of (aiResult.newLinks || [])) {
    const src = notes.find(n => n.title.toLowerCase() === link.sourceTitle.toLowerCase())
    const tgt = notes.find(n => n.title.toLowerCase() === link.targetTitle.toLowerCase())
    if (src && tgt && src.id !== tgt.id) {
      const { data: inserted } = await supabase.from('knowledge_links').insert({
        user_id: user.id,
        source_note_id: src.id,
        target_note_id: tgt.id,
        relationship: link.relationship || 'related',
        strength: link.strength || 0.7,
      }).select().single().catch(() => ({ data: null }))
      if (inserted) createdLinks.push(inserted.id)
    }
  }

  // Log cognitive event
  if (createdNotes.length > 0) {
    await supabase.from('cognitive_events').insert({
      user_id: user.id,
      event_type: 'insight_generated',
      related_note_ids: createdNotes,
      description: `AI generated ${createdNotes.length} insight notes and ${createdLinks.length} new connections. ${aiResult.summary?.slice(0, 150) || ''}`,
    })
  }

  return NextResponse.json({
    data: {
      ...aiResult,
      notesCreated: createdNotes.length,
      linksCreated: createdLinks.length,
    }
  })
}
