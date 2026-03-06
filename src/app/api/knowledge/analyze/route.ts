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
    .limit(150)

  const { data: links } = await supabase
    .from('knowledge_links')
    .select('*')
    .eq('user_id', user.id)

  if (!notes || notes.length === 0) {
    return NextResponse.json({ error: 'No notes to analyze' }, { status: 400 })
  }

  // Compute degree centrality locally
  const degreeMap = new Map<string, number>()
  for (const n of notes) degreeMap.set(n.id, 0)
  for (const l of (links || [])) {
    degreeMap.set(l.source_note_id, (degreeMap.get(l.source_note_id) || 0) + 1)
    degreeMap.set(l.target_note_id, (degreeMap.get(l.target_note_id) || 0) + 1)
  }

  // Find orphan notes (no links)
  const orphans = notes.filter(n => (degreeMap.get(n.id) || 0) === 0).map(n => n.title)

  // Find hub candidates (degree >= 3)
  const hubCandidates = notes
    .filter(n => (degreeMap.get(n.id) || 0) >= 3)
    .map(n => ({ title: n.title, degree: degreeMap.get(n.id) || 0 }))
    .sort((a, b) => b.degree - a.degree)

  // Upsert graph metrics
  for (const note of notes) {
    const degree = degreeMap.get(note.id) || 0
    const maxDeg = Math.max(...Array.from(degreeMap.values()), 1)
    await supabase.from('knowledge_graph_metrics').upsert({
      note_id: note.id,
      degree_centrality: degree / maxDeg,
      importance_score: (note.importance || 0.5) * 0.5 + (degree / maxDeg) * 0.5,
      updated_at: new Date().toISOString(),
    }).catch(() => null)
  }

  const formattedNotes = notes.slice(0, 60).map(n =>
    `[${n.type}] "${n.title}" (degree: ${degreeMap.get(n.id) || 0}, confidence: ${n.confidence})`
  ).join('\n')

  const formattedLinks = (links || []).slice(0, 80).map(l => {
    const src = notes.find(n => n.id === l.source_note_id)
    const tgt = notes.find(n => n.id === l.target_note_id)
    return src && tgt ? `"${src.title}" --[${l.relationship}]--> "${tgt.title}"` : null
  }).filter(Boolean).join('\n')

  const prompt = `Analyze this Zettelkasten knowledge graph structure.

NOTES (${notes.length} total):
${formattedNotes}

LINKS (${(links || []).length} total):
${formattedLinks || 'None'}

ORPHAN NOTES (no connections): ${orphans.slice(0, 10).join(', ') || 'None'}
HUB CANDIDATES (high connectivity): ${hubCandidates.slice(0, 5).map(h => `${h.title}(${h.degree})`).join(', ') || 'None'}

Perform deep structural analysis. Return ONLY valid JSON:
{
  "clusters": [{"name": string, "notes": string[], "strength": number, "description": string}],
  "orphanInsights": string (what do isolated notes suggest about unexplored territory?),
  "weakAreas": string[] (topics that need more development),
  "contradictions": [{"noteA": string, "noteB": string, "issue": string}],
  "topHubs": string[] (most connected / important notes),
  "structuralHealth": number (0-1, how well-connected the graph is),
  "recommendations": string[] (3-5 specific actions to improve the knowledge graph),
  "evolutionPhase": "seeding" | "growing" | "maturing" | "complex"
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
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

  return NextResponse.json({
    data: {
      ...aiResult,
      stats: {
        totalNotes: notes.length,
        totalLinks: (links || []).length,
        orphanCount: orphans.length,
        hubCount: hubCandidates.length,
        avgDegree: notes.length > 0
          ? (Array.from(degreeMap.values()).reduce((a, b) => a + b, 0) / notes.length).toFixed(2)
          : 0,
      }
    }
  })
}
