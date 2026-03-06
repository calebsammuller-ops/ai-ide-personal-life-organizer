import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const prompt = `You are an AI business strategist and innovation architect.

The user has the following knowledge background:
${noteSummary || 'No notes yet.'}
${context ? `\nAdditional context: ${context}` : ''}

The user wants to expand this seed idea into a full structured breakdown:
"${seedIdea}"

Return ONLY valid JSON:
{
  "title": "refined catchy name for the idea",
  "oneLiner": "one sentence elevator pitch",
  "market": "target market, estimated size, and opportunity",
  "features": ["core feature 1", "core feature 2", "core feature 3", "core feature 4"],
  "businessModel": "how it makes money (revenue streams, pricing model)",
  "competitors": ["competitor or analog 1", "competitor or analog 2", "competitor or analog 3"],
  "uniqueAdvantage": "what unique angle makes this hard to replicate (tie to user's knowledge if relevant)",
  "nextSteps": ["immediate action 1", "immediate action 2", "immediate action 3"],
  "risks": ["key risk 1", "key risk 2"],
  "noteContent": "a well-written permanent knowledge note summarizing this expanded idea (2-3 paragraphs)"
}`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
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
    }

    return NextResponse.json({ data: expansion, savedNoteId })
  } catch (error) {
    console.error('Idea expansion error:', error)
    return NextResponse.json({ error: 'Failed to expand idea' }, { status: 500 })
  }
}
