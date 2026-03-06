import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface SkillNode {
  name: string
  description?: string
  children?: SkillNode[]
  level?: number
  mastery?: number
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { skillTree, format } = await request.json()

  if (!skillTree) {
    return NextResponse.json({ error: 'skillTree is required' }, { status: 400 })
  }

  // Normalize input — accept JSON object, JSON string, or plain text list
  let parsedTree: SkillNode | SkillNode[] | string = skillTree
  if (typeof skillTree === 'string') {
    try {
      parsedTree = JSON.parse(skillTree)
    } catch {
      parsedTree = skillTree // treat as plain text
    }
  }

  const prompt = `You are converting a skill tree into a Zettelkasten knowledge graph.

SKILL TREE INPUT (format: ${format || 'auto-detect'}):
${JSON.stringify(parsedTree, null, 2)}

TASK: Convert this skill tree into atomic Zettelkasten notes with a hub-and-spoke structure.

Rules:
1. Create ONE hub note for the root skill area (type: "hub")
2. Create concept notes for each major skill/branch (type: "concept")
3. Create permanent notes for leaf skills with learning content (type: "permanent")
4. Generate meaningful connections between related skills
5. Add confidence based on mastery level if provided (0.4 for beginner, 0.7 for intermediate, 0.95 for expert)
6. Tags should reflect the domain, sub-domain, and skill type

Return ONLY valid JSON:
{
  "notes": [
    {
      "title": string,
      "type": "hub" | "concept" | "permanent",
      "content": string (2-4 sentences explaining this skill/concept and how it connects to others),
      "tags": string[],
      "confidence": number (0-1),
      "importance": number (0-1, hubs=0.9, concepts=0.7, leaves=0.5),
      "isHub": boolean
    }
  ],
  "links": [
    {
      "sourceTitle": string,
      "targetTitle": string,
      "relationship": "extends" | "applies_to" | "derived_from" | "related" | "supports"
    }
  ],
  "summary": string
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: {
    notes: { title: string; type: string; content: string; tags: string[]; confidence: number; importance: number; isHub?: boolean }[]
    links: { sourceTitle: string; targetTitle: string; relationship: string }[]
    summary: string
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  const createdNotes: { id: string; title: string }[] = []

  // Insert notes
  for (const note of (aiResult.notes || [])) {
    const zettelBase = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
    const zettelId = zettelBase + '_sk_' + Math.random().toString(36).slice(2, 5)

    const { data: inserted } = await supabase.from('knowledge_notes').insert({
      zettel_id: zettelId,
      user_id: user.id,
      title: note.title,
      type: note.type || 'concept',
      content: note.content || '',
      tags: note.tags || [],
      confidence: note.confidence ?? 0.7,
      importance: note.importance ?? 0.5,
      source: 'external',
      is_archived: false,
    }).select().single()

    if (inserted) createdNotes.push({ id: inserted.id, title: note.title })
  }

  // Insert links
  let linksCreated = 0
  for (const link of (aiResult.links || [])) {
    const src = createdNotes.find(n => n.title.toLowerCase() === link.sourceTitle.toLowerCase())
    const tgt = createdNotes.find(n => n.title.toLowerCase() === link.targetTitle.toLowerCase())
    if (src && tgt && src.id !== tgt.id) {
      await supabase.from('knowledge_links').insert({
        user_id: user.id,
        source_note_id: src.id,
        target_note_id: tgt.id,
        relationship: link.relationship || 'related',
        strength: 0.8,
      }).catch(() => null)
      linksCreated++
    }
  }

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'research_added',
    related_note_ids: createdNotes.map(n => n.id),
    description: `Imported skill tree: ${createdNotes.length} notes, ${linksCreated} connections. ${aiResult.summary?.slice(0, 100) || ''}`,
  })

  return NextResponse.json({
    data: {
      notesCreated: createdNotes.length,
      linksCreated,
      summary: aiResult.summary,
      notes: createdNotes,
    }
  })
}
