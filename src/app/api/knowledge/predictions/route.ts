import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('knowledge_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('confidence', { ascending: false })
      .limit(20)

    const predictions = (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      predictionType: p.prediction_type,
      description: p.description,
      relatedNoteIds: p.related_note_ids || [],
      confidence: p.confidence,
      isDismissed: p.is_dismissed,
      createdAt: p.created_at,
    }))

    return NextResponse.json({ data: predictions })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch notes and graph metrics
    const [{ data: notes }, { data: metrics }, { data: links }] = await Promise.all([
      supabase.from('knowledge_notes')
        .select('id, zettel_id, title, type, tags, confidence, importance, created_at')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('importance', { ascending: false })
        .limit(80),
      supabase.from('knowledge_graph_metrics')
        .select('note_id, degree_centrality, cluster_id, importance_score'),
      supabase.from('knowledge_links')
        .select('source_note_id, target_note_id, relationship')
        .eq('user_id', user.id),
    ])

    if (!notes || notes.length < 3) {
      return NextResponse.json({ data: [], message: 'Need at least 3 notes to generate predictions' })
    }

    // Build tag clusters
    const tagMap: Record<string, string[]> = {}
    for (const note of notes) {
      for (const tag of (note.tags || [])) {
        if (!tagMap[tag]) tagMap[tag] = []
        tagMap[tag].push(note.title)
      }
    }
    const clusters = Object.entries(tagMap)
      .filter(([, ns]) => ns.length >= 2)
      .slice(0, 15)
      .map(([tag, ns]) => `${tag}: ${ns.slice(0, 5).join(', ')}`)

    // Identify orphan notes (no links)
    const linkedIds = new Set([
      ...(links || []).map(l => l.source_note_id),
      ...(links || []).map(l => l.target_note_id),
    ])
    const orphans = notes.filter(n => !linkedIds.has(n.id)).slice(0, 10)
    const lowCentrality = (metrics || [])
      .filter(m => m.degree_centrality < 0.1)
      .map(m => notes.find(n => n.id === m.note_id)?.title)
      .filter(Boolean)
      .slice(0, 10)

    const prompt = `You are a knowledge graph intelligence engine analyzing a user's Zettelkasten second brain.

Notes (${notes.length} total):
${notes.slice(0, 40).map(n => `[${n.zettel_id || n.id.slice(0, 8)}] [${n.type}] "${n.title}" (importance: ${n.importance?.toFixed(2) || '0.5'}, tags: ${(n.tags || []).join(', ')})`).join('\n')}

Knowledge clusters (by tag co-occurrence):
${clusters.join('\n')}

Orphan notes (no connections):
${orphans.map(n => `"${n.title}"`).join(', ')}

Low-centrality notes (weakly connected):
${lowCentrality.join(', ')}

Generate 6-8 predictions that will genuinely help this user discover new knowledge. Be specific and actionable.

Return JSON:
{
  "predictions": [
    {
      "prediction_type": "missing_link" | "knowledge_gap" | "emerging_cluster" | "idea_opportunity" | "next_topic",
      "description": "specific, actionable description of what this predicts",
      "related_note_titles": ["title1", "title2"],
      "confidence": 0.0-1.0
    }
  ]
}

Prediction types:
- missing_link: two existing notes that should be connected
- knowledge_gap: a concept clearly missing from an existing cluster
- emerging_cluster: a topic that appears to be growing in importance
- idea_opportunity: a cross-cluster synthesis that could generate a powerful idea
- next_topic: the most likely topic the user will explore next based on trajectory`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ data: [], error: 'No predictions generated' })

    const parsed = JSON.parse(jsonMatch[0])
    const rawPredictions = parsed.predictions || []

    // Delete old undismissed predictions for this user
    await supabase.from('knowledge_predictions')
      .delete()
      .eq('user_id', user.id)
      .eq('is_dismissed', false)

    // Resolve note titles to IDs
    const titleToId: Record<string, string> = {}
    for (const note of notes) { titleToId[note.title] = note.id }

    const toInsert = rawPredictions.map((p: {
      prediction_type: string
      description: string
      related_note_titles?: string[]
      confidence?: number
    }) => ({
      user_id: user.id,
      prediction_type: p.prediction_type,
      description: p.description,
      related_note_ids: (p.related_note_titles || [])
        .map((t: string) => titleToId[t])
        .filter(Boolean),
      confidence: Math.min(1, Math.max(0, p.confidence || 0.7)),
    }))

    const { data: inserted } = await supabase
      .from('knowledge_predictions')
      .insert(toInsert)
      .select()

    const predictions = (inserted || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      predictionType: p.prediction_type,
      description: p.description,
      relatedNoteIds: p.related_note_ids || [],
      confidence: p.confidence,
      isDismissed: p.is_dismissed,
      createdAt: p.created_at,
    }))

    return NextResponse.json({ data: predictions })
  } catch (error) {
    console.error('Predictions error:', error)
    return NextResponse.json({ error: 'Failed to generate predictions' }, { status: 500 })
  }
}
