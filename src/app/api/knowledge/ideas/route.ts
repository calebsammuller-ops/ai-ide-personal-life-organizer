import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, content, tags, confidence, importance')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(80)

  const { data: links } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id, relationship')
    .eq('user_id', user.id)

  if (!notes || notes.length < 3) {
    return NextResponse.json({ error: 'Need at least 3 notes to generate ideas' }, { status: 400 })
  }

  // Build cluster map from links (simple connected components)
  const adjacency = new Map<string, Set<string>>()
  for (const n of notes) adjacency.set(n.id, new Set())
  for (const l of (links || [])) {
    adjacency.get(l.source_note_id)?.add(l.target_note_id)
    adjacency.get(l.target_note_id)?.add(l.source_note_id)
  }

  const formattedNotes = notes.map(n =>
    `[${n.zettel_id || n.id.slice(0, 8)}] [${n.type}] "${n.title}"\n${n.content?.slice(0, 200) || ''}\nTags: ${(n.tags || []).join(', ')}`
  ).join('\n---\n')

  const prompt = `You are an AI innovation strategist analyzing a personal knowledge graph.

KNOWLEDGE BASE (${notes.length} notes):
${formattedNotes}

TASK: Find cross-cluster synthesis opportunities — combinations of ideas from different knowledge areas that could become startup ideas, research directions, creative projects, or life improvements.

Look for:
- Unexpected connections between distant clusters
- Problems implied by multiple notes that a product could solve
- Skill combinations that create unique advantages
- Research gaps that need exploration
- Life optimization opportunities

Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": string,
      "description": string (2-3 sentences),
      "derivedFrom": string[] (note titles that inspired this),
      "opportunity": string (why this matters / market potential / personal value),
      "type": "startup" | "project" | "research" | "life-optimization" | "creative",
      "effort": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high"
    }
  ],
  "topTheme": string (the most powerful cross-cluster theme in your knowledge base),
  "uniqueAdvantage": string (what unique combination of knowledge gives you an edge)
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: {
    ideas: {
      title: string
      description: string
      derivedFrom: string[]
      opportunity: string
      type: string
      effort: string
      impact: string
    }[]
    topTheme: string
    uniqueAdvantage: string
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'idea_generated',
    related_note_ids: [],
    description: `AI generated ${(aiResult.ideas || []).length} cross-cluster ideas. Top theme: ${aiResult.topTheme || 'N/A'}`,
  })

  return NextResponse.json({ data: aiResult })
}
