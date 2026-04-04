/**
 * Autonomous Insight Engine
 * Detects dense knowledge clusters and synthesizes insight notes automatically.
 * Called from /api/knowledge/evolve after the main evolution cycle.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { detectClusters } from '@/lib/knowledge/graphAnalytics'
import { recordEvolution } from '@/lib/evolution/ideaEvolutionEngine'

interface NoteStub {
  id: string
  title: string
  content: string
  tags: string[]
  type: string
  createdAt?: string
}

interface LinkStub {
  sourceNoteId: string
  targetNoteId: string
}

const INSIGHT_COOLDOWN_DAYS = 7

// Check whether a cluster already has a recent ai-insight note
async function clusterHasRecentInsight(
  supabase: SupabaseClient,
  userId: string,
  noteIds: string[]
): Promise<boolean> {
  const cutoff = new Date(Date.now() - INSIGHT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('knowledge_notes')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .contains('tags', ['ai-insight'])
    .gte('created_at', cutoff)
    .limit(1)

  // Simple guard: skip if ANY recent insight exists for this user in this window
  // (a more precise check would cross-reference related_note_ids in cognitive_events)
  return (data?.length ?? 0) > 0
}

export async function generateInsightNotes(
  supabase: SupabaseClient,
  userId: string,
  notes: NoteStub[],
  links: LinkStub[]
): Promise<{ created: number }> {
  if (notes.length < 3) return { created: 0 }

  const nodeRefs = notes.map(n => ({ id: n.id, title: n.title }))
  const clusters = detectClusters(nodeRefs, links)

  // Focus on clusters with 3+ nodes that don't already have recent insights
  const eligibleClusters = clusters.filter(c => c.nodeIds.length >= 3)
  if (eligibleClusters.length === 0) return { created: 0 }

  const hasRecent = await clusterHasRecentInsight(supabase, userId, eligibleClusters[0].nodeIds)
  if (hasRecent) return { created: 0 }

  const noteById = new Map(notes.map(n => [n.id, n]))
  let created = 0

  // Process up to 2 largest clusters
  for (const cluster of eligibleClusters.slice(0, 2)) {
    const clusterNotes = cluster.nodeIds
      .map(id => noteById.get(id))
      .filter(Boolean) as NoteStub[]

    const noteSnippets = clusterNotes
      .slice(0, 8)
      .map(n => `"${n.title}": ${n.content.slice(0, 120)}`)
      .join('\n')

    const prompt = `You are a knowledge synthesis AI. Analyze these ${clusterNotes.length} interconnected notes and write a 2-3 sentence insight that reveals the non-obvious connection between them.

Notes:
${noteSnippets}

Return JSON: {"title": string, "content": string, "tags": string[]}`

    const result = await sendMessage({
      model: 'claude-opus-4-6',
      maxTokens: 400,
      messages: [{ role: 'user', content: prompt }],
      userId,
    })

    if (!result.success || !result.data) continue

    const jsonMatch = result.data.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) continue

    try {
      const insight = JSON.parse(jsonMatch[0])

      const now = new Date()
      const zettelId = now.toISOString().replace(/[-:T]/g, '').slice(0, 12) + '_ins_' + Math.random().toString(36).slice(2, 5)

      const { data: inserted } = await supabase
        .from('knowledge_notes')
        .insert({
          user_id: userId,
          zettel_id: zettelId,
          title: insight.title,
          type: 'permanent',
          content: insight.content,
          tags: [...(insight.tags || []), 'ai-insight'],
          confidence: 0.8,
          importance: 0.75,
          source: 'AI',
        })
        .select('id')
        .single()

      if (inserted) {
        created++
        await supabase.from('cognitive_events').insert({
          user_id: userId,
          event_type: 'insight_generated',
          related_note_ids: [inserted.id, ...clusterNotes.slice(0, 3).map(n => n.id)],
          description: `Insight generated: "${insight.title}"`,
        }).catch(() => {})

        // Record insight evolution for the hub note of the cluster
        const hubNote = clusterNotes[0]
        if (hubNote) {
          await recordEvolution(
            supabase,
            userId,
            hubNote.id,
            inserted.id,
            'insight',
            `Insight synthesized: "${insight.title}" from cluster of ${clusterNotes.length} notes`
          )
        }
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return { created }
}
