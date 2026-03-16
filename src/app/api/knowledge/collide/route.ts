import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildCollisionPrompt } from '@/lib/ai/prompts/collision'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, title, tags')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(150)

  if (!notes || notes.length < 6) {
    return NextResponse.json(
      { error: 'Add at least 6 ideas to enable collision detection' },
      { status: 400 }
    )
  }

  // Group notes by dominant tag to create clusters
  const tagMap = new Map<string, string[]>()
  for (const note of notes) {
    for (const tag of (note.tags || [])) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag)!.push(note.title)
    }
  }

  // Sort clusters by size, take top 8
  const clusters = Array.from(tagMap.entries())
    .filter(([, titles]) => titles.length >= 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([theme, titles]) => ({ theme, notes: titles.slice(0, 6) }))

  if (clusters.length < 2) {
    // Fall back to splitting all notes into 2 halves by note type if no tags
    const half = Math.floor(notes.length / 2)
    const clusterA = { theme: 'First ideas', notes: notes.slice(0, half).map(n => n.title) }
    const clusterB = { theme: 'Recent ideas', notes: notes.slice(half).map(n => n.title) }
    return runCollision(anthropic, clusterA, clusterB)
  }

  // Find two clusters with least tag overlap (most different themes)
  let bestPair: [typeof clusters[0], typeof clusters[0]] = [clusters[0], clusters[1]]
  let lowestOverlap = Infinity

  for (let i = 0; i < clusters.length - 1; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const aTheme = clusters[i].theme.toLowerCase()
      const bTheme = clusters[j].theme.toLowerCase()
      // Simple character-level overlap heuristic
      const overlap = aTheme.split('').filter(c => bTheme.includes(c)).length
      if (overlap < lowestOverlap) {
        lowestOverlap = overlap
        bestPair = [clusters[i], clusters[j]]
      }
    }
  }

  const [clusterA, clusterB] = bestPair
  return runCollision(anthropic, clusterA, clusterB)
}

async function runCollision(
  anthropic: Anthropic,
  clusterA: { theme: string; notes: string[] },
  clusterB: { theme: string; notes: string[] }
): Promise<Response> {
  const prompt = buildCollisionPrompt(clusterA, clusterB)

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (response.content[0] as { type: string; text: string }).text

  let parsed: Record<string, unknown>
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse collision result' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      clusterA,
      clusterB,
      collision: parsed.collision,
    },
  })
}
