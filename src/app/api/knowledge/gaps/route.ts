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
    .select('id, zettel_id, title, type, content, tags, confidence')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: links } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id, relationship')
    .eq('user_id', user.id)

  if (!notes || notes.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 notes to detect gaps' }, { status: 400 })
  }

  // Group notes by tags/topics to identify clusters
  const tagClusters = new Map<string, string[]>()
  for (const note of notes) {
    for (const tag of (note.tags || [])) {
      if (!tagClusters.has(tag)) tagClusters.set(tag, [])
      tagClusters.get(tag)!.push(note.title)
    }
  }

  const clustersFormatted = Array.from(tagClusters.entries())
    .filter(([, v]) => v.length >= 2)
    .slice(0, 20)
    .map(([tag, titles]) => `[${tag}]: ${titles.join(', ')}`)
    .join('\n')

  const formattedNotes = notes.map(n =>
    `[${n.type}] "${n.title}" (confidence: ${n.confidence})\nTags: ${(n.tags || []).join(', ')}\n${n.content?.slice(0, 150) || ''}`
  ).join('\n---\n')

  const prompt = `Analyze this Zettelkasten knowledge base to identify critical knowledge gaps.

NOTES (${notes.length}):
${formattedNotes}

TAG CLUSTERS:
${clustersFormatted || 'No clusters identified yet'}

TASK: Identify 5-8 specific knowledge gaps — concepts, skills, or frameworks that are notably ABSENT but would logically:
1. Bridge existing clusters
2. Deepen understanding of existing notes
3. Unlock new capabilities based on what the person is learning
4. Prevent errors implied by current knowledge

For each gap, provide a concrete learning path.

Return ONLY valid JSON:
{
  "gaps": [
    {
      "topic": string (the missing concept/skill),
      "reason": string (why this gap exists and why it matters),
      "relatedNotes": string[] (existing notes that point to this gap),
      "suggestedLearning": string (specific resources, books, or approaches),
      "priority": "critical" | "high" | "medium",
      "type": "concept" | "skill" | "framework" | "domain"
    }
  ],
  "patternInsight": string (what the gaps reveal about the person's thinking style),
  "nextFocusArea": string (the single most impactful area to study next)
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text
  let aiResult: Record<string, unknown>

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }

  // Log cognitive event
  await supabase.from('cognitive_events').insert({
    user_id: user.id,
    event_type: 'knowledge_gap_detected',
    related_note_ids: [],
    description: `Detected ${(aiResult.gaps as unknown[])?.length || 0} knowledge gaps. Next focus: ${aiResult.nextFocusArea || 'N/A'}`,
  })

  return NextResponse.json({ data: aiResult })
}
