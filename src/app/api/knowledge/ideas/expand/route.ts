import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/ai/anthropicClient'
import { withAuth, withApiHandler } from '@/lib/api/middleware'
import { buildIdeaExpandPrompt } from '@/lib/ai/prompts/knowledge'
import { recordEvolution } from '@/lib/evolution/ideaEvolutionEngine'
import type { User } from '@supabase/supabase-js'

export const POST = withApiHandler(withAuth(async (request: Request, user: User) => {
  const supabase = await createClient()

  const { seedIdea, context, save } = await request.json()
  if (!seedIdea?.trim()) return NextResponse.json({ error: 'seedIdea required' }, { status: 400 })

  // Fetch top notes as background context
  const { data: notes } = await supabase
    .from('knowledge_notes')
    .select('title, type, tags, content')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('importance', { ascending: false })
    .limit(30)

  const noteSummary = (notes || []).slice(0, 20)
    .map(n => `- [${n.type}] "${n.title}" (tags: ${(n.tags || []).join(', ')})`)
    .join('\n')

  const prompt = buildIdeaExpandPrompt(seedIdea, noteSummary, context)

  const result = await sendMessage({
    model: 'claude-opus-4-6',
    maxTokens: 2000,
    messages: [{ role: 'user', content: prompt }],
    userId: user.id,
  })

  if (!result.success || !result.data) {
    return NextResponse.json({ error: 'Failed to expand idea' }, { status: 500 })
  }

  const text = result.data.content
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse expansion' }, { status: 500 })

  const expansion = JSON.parse(jsonMatch[0])

  // Optionally save as a knowledge note
  let savedNoteId: string | null = null
  if (save) {
    const { data: note } = await supabase
      .from('knowledge_notes')
      .insert({
        user_id: user.id,
        title: expansion.title || seedIdea,
        type: 'project',
        content: expansion.noteContent || `${expansion.oneLiner}\n\nMarket: ${expansion.market}\n\nBusiness Model: ${expansion.businessModel}`,
        tags: ['idea', 'expansion'],
        confidence: 0.75,
        importance: 0.8,
        source: 'AI',
      })
      .select('id')
      .single()

    savedNoteId = note?.id || null

    // Log cognitive event
    await supabase.from('cognitive_events').insert({
      user_id: user.id,
      event_type: 'idea_generated',
      related_note_ids: savedNoteId ? [savedNoteId] : [],
      description: `Expanded idea: "${expansion.title || seedIdea}"`,
    })

    // Record evolution: the saved note is an expansion of the seed idea
    // Use savedNoteId as both source and derived since it's a new note from scratch
    if (savedNoteId) {
      await recordEvolution(
        supabase,
        user.id,
        savedNoteId,
        savedNoteId,
        'expansion',
        `AI expanded seed idea "${seedIdea}" into "${expansion.title || seedIdea}"`
      )
    }
  }

  return NextResponse.json({ data: expansion, savedNoteId })
}))
