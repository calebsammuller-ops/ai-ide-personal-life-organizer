import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// This endpoint runs the full knowledge graph evolution cycle.
// Called by: nightly cron, or manually by user.
// Auth: either Supabase session OR x-cron-secret header for cron calls.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Allow cron calls with secret, otherwise require auth
    const cronSecret = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    const isCron = !!expectedSecret && cronSecret === expectedSecret

    let userId: string

    if (isCron) {
      // Cron: evolve for ALL users who have notes
      const { data: userIds } = await supabase
        .from('knowledge_notes')
        .select('user_id')
        .eq('is_archived', false)
        .limit(100)

      const uniqueUsers = [...new Set((userIds || []).map(r => r.user_id))]
      let totalInsights = 0, totalLinks = 0, totalPredictions = 0, totalCompressed = 0

      for (const uid of uniqueUsers) {
        const result = await evolveForUser(supabase, uid)
        totalInsights += result.insightsCreated
        totalLinks += result.linksCreated
        totalPredictions += result.predictionsGenerated
        totalCompressed += result.notesCompressed
      }

      return NextResponse.json({
        insightsCreated: totalInsights,
        linksCreated: totalLinks,
        predictionsGenerated: totalPredictions,
        notesCompressed: totalCompressed,
        usersProcessed: uniqueUsers.length,
      })
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      userId = user.id

      const result = await evolveForUser(supabase, userId)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Evolve error:', error)
    return NextResponse.json({ error: 'Evolution failed' }, { status: 500 })
  }
}

async function evolveForUser(supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never, userId: string) {
  let insightsCreated = 0
  let linksCreated = 0
  let predictionsGenerated = 0
  let notesCompressed = 0

  // Fetch notes
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('id, zettel_id, title, type, tags, content, confidence, importance, source, created_at')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(60)

  if (!notes || notes.length < 3) return { insightsCreated, linksCreated, predictionsGenerated, notesCompressed }

  const { data: existingLinks } = await supabase
    .from('knowledge_links')
    .select('source_note_id, target_note_id')
    .eq('user_id', userId)

  const linkedPairs = new Set((existingLinks || []).map(l => `${l.source_note_id}:${l.target_note_id}`))
  const titleToId: Record<string, string> = {}
  for (const n of notes) { titleToId[n.title] = n.id }

  // Step 1: Generate new insights
  try {
    const insightPrompt = `Analyze this Zettelkasten knowledge graph for user ${userId}.

Notes (${notes.length}):
${notes.slice(0, 30).map(n => `[${n.zettel_id || n.id.slice(0,8)}] [${n.type}] "${n.title}" - ${n.content?.slice(0, 80)}`).join('\n')}

Generate 2-3 NEW synthesis notes that reveal non-obvious connections, plus 3-5 new links.
Focus on cross-cluster insights that aren't already obvious.

Return JSON:
{
  "newNotes": [{"title": string, "type": "permanent"|"hub", "content": string, "tags": string[], "confidence": 0.7-0.9}],
  "newLinks": [{"sourceTitle": string, "targetTitle": string, "relationship": "supports"|"extends"|"derived_from"|"related"}]
}`

    const insightResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: insightPrompt }],
    })

    const insightText = insightResponse.content[0].type === 'text' ? insightResponse.content[0].text : ''
    const insightJson = insightText.match(/\{[\s\S]*\}/)

    if (insightJson) {
      const { newNotes = [], newLinks = [] } = JSON.parse(insightJson[0])
      const now = new Date()
      const base = now.toISOString().replace(/[-:T]/g, '').slice(0, 12)

      for (const note of newNotes.slice(0, 3)) {
        const zettelId = `${base}_ev_${Math.random().toString(36).slice(2, 6)}`
        const { data: inserted } = await supabase.from('knowledge_notes').insert({
          user_id: userId,
          zettel_id: zettelId,
          title: note.title,
          type: note.type || 'permanent',
          content: note.content,
          tags: note.tags || [],
          confidence: note.confidence || 0.8,
          importance: 0.7,
          source: 'AI',
        }).select('id, title').single()

        if (inserted) {
          titleToId[inserted.title] = inserted.id
          insightsCreated++
          await supabase.from('cognitive_events').insert({
            user_id: userId,
            event_type: 'insight_generated',
            related_note_ids: [inserted.id],
            description: `Evolution created insight: "${inserted.title}"`,
          })
        }
      }

      for (const link of newLinks.slice(0, 5)) {
        const sourceId = titleToId[link.sourceTitle]
        const targetId = titleToId[link.targetTitle]
        if (!sourceId || !targetId || sourceId === targetId) continue
        const pairKey = `${sourceId}:${targetId}`
        if (linkedPairs.has(pairKey)) continue
        const { error } = await supabase.from('knowledge_links').insert({
          user_id: userId,
          source_note_id: sourceId,
          target_note_id: targetId,
          relationship: link.relationship || 'related',
          strength: 0.75,
        })
        if (!error) { linksCreated++; linkedPairs.add(pairKey) }
      }
    }
  } catch { /* non-blocking */ }

  // Step 2: Refresh predictions
  try {
    const tagMap: Record<string, string[]> = {}
    for (const note of notes) {
      for (const tag of (note.tags || [])) {
        if (!tagMap[tag]) tagMap[tag] = []
        tagMap[tag].push(note.title)
      }
    }
    const clusters = Object.entries(tagMap).filter(([, ns]) => ns.length >= 2).slice(0, 12)

    const predPrompt = `Knowledge graph has ${notes.length} notes across clusters: ${clusters.map(([t]) => t).join(', ')}.

Top notes: ${notes.slice(0, 15).map(n => `"${n.title}"`).join(', ')}

Generate 4-5 specific predictions. Return JSON:
{
  "predictions": [
    {"prediction_type": "missing_link"|"knowledge_gap"|"emerging_cluster"|"idea_opportunity"|"next_topic", "description": string, "related_note_titles": string[], "confidence": number}
  ]
}`

    const predResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: predPrompt }],
    })

    const predText = predResponse.content[0].type === 'text' ? predResponse.content[0].text : ''
    const predJson = predText.match(/\{[\s\S]*\}/)

    if (predJson) {
      const { predictions = [] } = JSON.parse(predJson[0])
      await supabase.from('knowledge_predictions').delete()
        .eq('user_id', userId).eq('is_dismissed', false)

      for (const p of predictions.slice(0, 5)) {
        await supabase.from('knowledge_predictions').insert({
          user_id: userId,
          prediction_type: p.prediction_type,
          description: p.description,
          related_note_ids: (p.related_note_titles || []).map((t: string) => titleToId[t]).filter(Boolean),
          confidence: Math.min(1, Math.max(0, p.confidence || 0.7)),
        })
        predictionsGenerated++
      }
    }
  } catch { /* non-blocking */ }

  // Step 3: Memory compression — archive dormant notes into hub summaries
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: dormant } = await supabase
      .from('knowledge_notes')
      .select('id, title, content, tags, type')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .eq('type', 'fleeting')
      .lt('updated_at', ninetyDaysAgo)
      .limit(20)

    if (dormant && dormant.length >= 10) {
      // Compress dormant fleeting notes into a hub summary
      const summaryPrompt = `Compress these ${dormant.length} old fleeting notes into a single hub summary note.

Notes:
${dormant.map(n => `- "${n.title}": ${n.content?.slice(0, 100)}`).join('\n')}

Return JSON: {"title": string, "content": string, "tags": string[]}`

      const compressResponse = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: summaryPrompt }],
      })

      const compressText = compressResponse.content[0].type === 'text' ? compressResponse.content[0].text : ''
      const compressJson = compressText.match(/\{[\s\S]*\}/)

      if (compressJson) {
        const hub = JSON.parse(compressJson[0])
        const now = new Date()
        const base = now.toISOString().replace(/[-:T]/g, '').slice(0, 12)

        await supabase.from('knowledge_notes').insert({
          user_id: userId,
          zettel_id: `${base}_hub_${Math.random().toString(36).slice(2, 5)}`,
          title: hub.title,
          type: 'hub',
          content: hub.content,
          tags: hub.tags || [],
          source: 'AI',
          importance: 0.6,
          metadata: { compressedFrom: dormant.map(n => n.id) },
        })

        // Archive the compressed notes
        await supabase.from('knowledge_notes')
          .update({ is_archived: true })
          .in('id', dormant.map(n => n.id))

        notesCompressed = dormant.length
      }
    }
  } catch { /* non-blocking */ }

  return { insightsCreated, linksCreated, predictionsGenerated, notesCompressed }
}
